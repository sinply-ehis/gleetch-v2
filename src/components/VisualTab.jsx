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
import { useQuality } from '../core/quality.jsx';

const IMAGE_EFFECTS = getEffectsFor('image');

export default function VisualTab({ seed, iter, onReroll, mode, setMode, uploadedImg, setUploadedImg, initialRecipe }) {
  const { current: quality } = useQuality();
  
  // The tab always carries a random effect chain: a fresh random pick on
  // mount (unless a shared recipe says otherwise), and an instant random
  // refill if the user removes every effect.
  const [algos, setAlgos] = useState(() => {
    if (initialRecipe?.a?.length) return initialRecipe.a;
    return randomEffectSelection('image', prng(Date.now() % 999999));
  });
  const [intensity, setIntensity] = useState(initialRecipe?.i ?? 0.55);
  const [channel, setChannel] = useState(initialRecipe?.c ?? 'brightness');
  const [effectParams, setEffectParams] = useState(initialRecipe?.p ?? {});
  const [preset, setPreset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const workRef = useRef(null);
  const outRef = useRef(null);

  // Reused output ImageData (getImageData itself always allocates fresh)
  const outImageDataRef = useRef(null);

  // Quality-adaptive dimensions
  const maxDim = quality.maxCanvasDim;
  const dims = useMemo(
    () => {
      if (mode === 'upload' && uploadedImg) {
        const { W, H } = computeAdaptiveSize(uploadedImg);
        return { W: Math.min(W, maxDim), H: Math.min(H, maxDim) };
      }
      return { W: Math.min(SIZE, maxDim), H: Math.min(SIZE, maxDim) };
    },
    [mode, uploadedImg, maxDim]
  );

  // Debounced intensity/effectParams for sliders
  const [intensityDebounced, setIntensityDebounced] = useState(intensity);
  const [effectParamsDebounced, setEffectParamsDebounced] = useState(effectParams);

  useEffect(() => {
    const t = setTimeout(() => setIntensityDebounced(intensity), 80);
    return () => clearTimeout(t);
  }, [intensity]);

  useEffect(() => {
    const t = setTimeout(() => setEffectParamsDebounced(effectParams), 80);
    return () => clearTimeout(t);
  }, [effectParams]);

  const run = useCallback(() => {
    const wc = workRef.current, oc = outRef.current;
    if (!wc || !oc) return;
    const { W, H } = dims;
    setBusy(true);
    const render = () => {
      const ctx = wc.getContext('2d', { willReadFrequently: true });
      const rng = prng(seed);

      if (mode === 'upload' && uploadedImg) {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(uploadedImg, 0, 0, W, H);
      } else {
        const pattern = PATTERNS[Math.floor(rng() * PATTERNS.length)];
        try { pattern.fn(ctx, W, H, rng); }
        catch { ctx.fillStyle = '#FF2D6B'; ctx.fillRect(0, 0, W, H); }
      }

      // getImageData always returns a fresh ImageData — the reuse win is
      // the work canvas + the output ImageData, not this read.
      let buf = ctx.getImageData(0, 0, W, H).data;

      buf = applyEffectChain(buf, algos, { mediaType: 'image', W, H, intensity: intensityDebounced, channel }, prng(seed + 999), effectParamsDebounced);

      // Reuse output ImageData
      let outImgData = outImageDataRef.current;
      if (!outImgData || outImgData.width !== W || outImgData.height !== H) {
        outImgData = oc.getContext('2d').createImageData(W, H);
        outImageDataRef.current = outImgData;
      }
      outImgData.data.set(buf);
      oc.getContext('2d').putImageData(outImgData, 0, 0);
    };
    setTimeout(() => {
      try { render(); }
      catch (err) { console.error('VisualTab render failed:', err); }
      finally { setBusy(false); }
    }, 10);
  }, [seed, mode, uploadedImg, algos, intensityDebounced, channel, dims, effectParamsDebounced]);

  useEffect(() => { run(); }, [run]);

  // Removing the last effect never leaves an empty chain: roll a fresh
  // random one at the removal site instead of refilling in an effect.
  const rollFreshChain = () => randomEffectSelection('image', prng(Date.now() % 999999));
  const withoutOrRefill = (chain, id) => {
    const next = chain.filter((a) => a !== id);
    return next.length ? next : rollFreshChain();
  };

  const applyPreset = (k) => { const p = IMAGE_PRESETS[k]; setAlgos(p.algos); setIntensity(p.intensity); setPreset(k); };
  const toggleAlgo = (id) => { setPreset(null); setAlgos((p) => (p.includes(id) ? withoutOrRefill(p, id) : [...p, id])); };

  const shuffle = () => {
    const rng = prng(Date.now() % 999999);
    setPreset(null);
    setAlgos(randomEffectSelection('image', rng, { exclude: algos }));
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
        <ActiveChainList algos={algos} mediaType="image" onReorder={setAlgos} onRemove={(id) => setAlgos((p) => withoutOrRefill(p, id))} effectParams={effectParams} onParamsChange={setEffectParams} />

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
        <div className="canvas-hint">quality: {quality.name} · {dims.W}×{dims.H} · {quality.enableHeavyEffects ? 'all effects' : 'heavy effects disabled'}</div>
      </main>
    </>
  );
}