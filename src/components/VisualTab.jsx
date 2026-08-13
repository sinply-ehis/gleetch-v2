import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { prng } from '../core/rng.js';
import { loadImageFile, computeAdaptiveSize } from '../core/canvas-utils.js';
import { CANVAS_SIZE as SIZE } from '../core/constants.js';
import { PATTERNS } from '../patterns/registry.js';
import { getEffectsFor, applyEffectChain, randomEffectSelection } from '../effects/registry.js';
import { IMAGE_PRESETS, V_CHANNELS } from '../effects/presets.js';
import AlgoPanel from './AlgoPanel.jsx';
import PresetPanel from './PresetPanel.jsx';
import UploadZone from './UploadZone.jsx';
import ShuffleButton from './ShuffleButton.jsx';
import ScrambleText from './ScrambleText.jsx';
import ActiveChainList from './ActiveChainList.jsx';
import CopyRecipeButton from './CopyRecipeButton.jsx';

const IMAGE_EFFECTS = getEffectsFor('image');

export default function VisualTab({ seed, iter, onReroll, mode, setMode, uploadedImg, setUploadedImg, initialRecipe }) {
  const [algos, setAlgos] = useState(initialRecipe?.a ?? ['pixelSort', 'chanShift']);
  const [intensity, setIntensity] = useState(initialRecipe?.i ?? 0.55);
  const [channel, setChannel] = useState(initialRecipe?.c ?? 'brightness');
  const [effectParams, setEffectParams] = useState(initialRecipe?.p ?? {});
  const [preset, setPreset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const workRef = useRef(null);
  const outRef = useRef(null);

  // computeAdaptiveSize is pure and cheap, so this is derived directly
  // during render rather than synced into separate state via an effect —
  // no need for the extra render-then-effect-then-rerender round trip.
  // Wrapped in useMemo so the object reference stays stable across renders
  // when mode/uploadedImg haven't actually changed — without it, a fresh
  // {W,H} object every render would make run()'s useCallback see a
  // "changed" dependency every time even when the values are identical.
  const dims = useMemo(
    () => (mode === 'upload' && uploadedImg ? computeAdaptiveSize(uploadedImg) : { W: SIZE, H: SIZE }),
    [mode, uploadedImg]
  );

  const run = useCallback(() => {
    const wc = workRef.current, oc = outRef.current;
    if (!wc || !oc) return;
    const { W, H } = dims;
    setBusy(true);
    setTimeout(() => {
      const ctx = wc.getContext('2d');
      const rng = prng(seed);
      if (mode === 'upload' && uploadedImg) {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(uploadedImg, 0, 0, W, H);
      } else {
        const pattern = PATTERNS[Math.floor(rng() * PATTERNS.length)];
        try { pattern.fn(ctx, W, H, rng); }
        catch { ctx.fillStyle = '#FF2D6B'; ctx.fillRect(0, 0, W, H); }
      }
      let buf = ctx.getImageData(0, 0, W, H).data;
      buf = applyEffectChain(buf, algos, { mediaType: 'image', W, H, intensity, channel }, prng(seed + 999), effectParams);
      const octx = oc.getContext('2d');
      const od = octx.createImageData(W, H);
      od.data.set(buf);
      octx.putImageData(od, 0, 0);
      setBusy(false);
    }, 10);
  }, [seed, mode, uploadedImg, algos, intensity, channel, dims, effectParams]);

  useEffect(() => { run(); }, [run]);

  const applyPreset = (k) => { const p = IMAGE_PRESETS[k]; setAlgos(p.algos); setIntensity(p.intensity); setPreset(k); };
  const toggleAlgo = (id) => { setPreset(null); setAlgos((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id])); };

  const shuffle = () => {
    const rng = prng(Date.now() % 999999);
    setPreset(null);
    setAlgos(randomEffectSelection('image', rng));
    setIntensity(0.3 + rng() * 0.6);
  };

  const download = (format = 'png') => {
    const oc = outRef.current; if (!oc) return;
    const a = document.createElement('a');
    a.href = format === 'jpg' ? oc.toDataURL('image/jpeg', 0.92) : oc.toDataURL('image/png');
    a.download = `gleetch-${String(seed).padStart(6, '0')}.${format === 'jpg' ? 'jpg' : 'png'}`;
    a.click();
  };

  const copy = () => {
    const oc = outRef.current; if (!oc) return;
    oc.toBlob(async (blob) => {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); }
      catch { download(); }
    });
  };

  const onDropImage = async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) { setUploadedImg(await loadImageFile(f)); setMode('upload'); }
  };

  const seedStr = String(seed).padStart(6, '0');

  return (
    <>
      <canvas ref={workRef} width={dims.W} height={dims.H} style={{ display: 'none' }} />
      <aside className="sidebar">
        <div className="mode-row">
          <button className={`mode-btn ${mode === 'generate' ? 'on' : ''}`} onClick={() => setMode('generate')}>✦ GENERATE</button>
          <button className={`mode-btn ${mode === 'upload' ? 'on' : ''}`} onClick={() => setMode('upload')}>↑ UPLOAD</button>
        </div>

        {mode === 'upload' ? (
          <UploadZone label="IMAGE" subLabel="click · paste · drag & drop" loaded={!!uploadedImg}
            onFile={async (f) => { if (f) setUploadedImg(await loadImageFile(f)); }} />
        ) : (
          <div className="gen-box">
            <div className="gen-icon">⟳</div>
            <div className="gen-text">120 HIDDEN PATTERNS<br />unique every roll</div>
          </div>
        )}

        <div className="div" />
        <span className="lbl">PRESETS</span>
        <PresetPanel presets={IMAGE_PRESETS} active={preset} onSelect={applyPreset} />
        <button className="adv-toggle" onClick={() => setShowAdv((v) => !v)}>{showAdv ? '▼' : '▶'} EFFECTS ({IMAGE_EFFECTS.length})</button>
        {showAdv && (
          <div className="algo-scroll">
            <AlgoPanel effects={IMAGE_EFFECTS} active={algos} onToggle={toggleAlgo} />
            {algos.includes('pixelSort') && (
              <>
                <span className="lbl" style={{ marginTop: 8 }}>SORT CHANNEL</span>
                <div className="ch-row">
                  {V_CHANNELS.map((c) => (
                    <button key={c.id} className={`ch-btn ${channel === c.id ? 'on' : ''}`} onClick={() => setChannel(c.id)}>{c.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <ActiveChainList algos={algos} mediaType="image" onReorder={setAlgos} onRemove={(id) => setAlgos((p) => p.filter((a) => a !== id))} effectParams={effectParams} onParamsChange={setEffectParams} />

        <div className="div" />
        <div className="sec">
          <span className="lbl">INTENSITY — {(intensity * 100).toFixed(0)}%</span>
          <input type="range" className="slider" min=".05" max="1" step=".01"
            value={intensity} onChange={(e) => { setPreset(null); setIntensity(parseFloat(e.target.value)); }} />
        </div>
        <div className="div" />
        <div className="seed-row"><span className="seed-lbl">SEED</span><span className="seed-val">#{seedStr}</span></div>
        <button className="reroll-btn" onClick={onReroll} disabled={busy}>{busy ? 'RENDERING...' : '⟳  RE-ROLL'}</button>
        <ShuffleButton onClick={shuffle} disabled={busy} />
        <div className="action-row">
          <button className="act-btn" onClick={() => download('png')}>↓ PNG</button>
          <button className="act-btn" onClick={() => download('jpg')}>↓ JPG</button>
          <button className="act-btn" onClick={copy}>⎘ COPY</button>
        </div>
        <CopyRecipeButton getRecipe={() => ({ t: 'visual', s: seed, a: algos, i: intensity, c: channel, p: effectParams })} />
      </aside>
      <main className="main">
        <div className="canvas-wrap" onDragOver={(e) => e.preventDefault()} onDrop={onDropImage}>
          <canvas ref={outRef} width={dims.W} height={dims.H} className="out-canvas" />
          <div className="crt" />
          {busy && <div className="busy-ov"><span className="busy-lbl"><ScrambleText text="RENDERING" active={busy} /></span></div>}
        </div>
        <div className="canvas-meta">
          <span>{dims.W}×{dims.H} · PNG</span><span>SEED #{seedStr}</span>
          <span>ITER {String(iter).padStart(4, '0')}</span>
          <span>{algos.length} EFFECT{algos.length !== 1 ? 'S' : ''}</span>
        </div>
        <div className="canvas-hint">SPACE to re-roll · paste or drag image · shuffle for a new effect combo</div>
      </main>
    </>
  );
}
