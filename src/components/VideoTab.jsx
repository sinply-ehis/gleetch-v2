import { useState, useRef, useCallback, useEffect } from 'react';
import { prng } from '../core/rng.js';
import { getEffectsFor, applyVideoEffectChain, randomEffectSelection } from '../effects/registry.js';
import { IMAGE_PRESETS } from '../effects/presets.js';
import { useVideoAudioTrack } from './useVideoAudioTrack.js';
import { useVideoExport } from './useVideoExport.js';
import VideoAudioTrackPanel from './VideoAudioTrackPanel.jsx';
import AlgoPanel from './AlgoPanel.jsx';
import PresetPanel from './PresetPanel.jsx';
import UploadZone from './UploadZone.jsx';
import ShuffleButton from './ShuffleButton.jsx';
import ScrambleText from './ScrambleText.jsx';
import ActiveChainList from './ActiveChainList.jsx';
import CopyRecipeButton from './CopyRecipeButton.jsx';

// Only effects tagged for 'video' — includes oilPaint/overlay now (tagged
// realtimeSafe:false), which are selectable here but only actually applied
// via the FULL QUALITY FRAME capture, not continuous playback/export. See
// applyVideoEffectChain in effects/registry.js for the filtering logic.
const VIDEO_EFFECTS = getEffectsFor('video');
const AUDIO_TRACK_EFFECTS = getEffectsFor('audio');

export default function VideoTab({ seed, onReroll, initialRecipe }) {
  const [videoFile, setVideoFile] = useState(null);
  const [algos, setAlgos] = useState(initialRecipe?.a ?? ['pixelSort', 'chanShift']);
  const [intensity, setIntensity] = useState(initialRecipe?.i ?? 0.55);
  const [effectParams, setEffectParams] = useState(initialRecipe?.p ?? {});
  const [preset, setPreset] = useState(null);
  const [showAdv, setShowAdv] = useState(false);
  const [showAudioTrack, setShowAudioTrack] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fqBusy, setFqBusy] = useState(false);

  const videoRef = useRef(null);
  const workRef = useRef(null);
  const outRef = useRef(null);
  const animRef = useRef(null);
  const renderFrameRef = useRef(null);
  const audioTrack = useVideoAudioTrack();

  // Refs mirror the latest state so the requestAnimationFrame loop never
  // reads stale closures (this bit the monolith before — see the video RAF
  // stale-closure fix in the build history).
  const algosRef = useRef(algos);
  const intensityRef = useRef(intensity);
  const seedRef = useRef(seed);
  const effectParamsRef = useRef(effectParams);
  useEffect(() => { algosRef.current = algos; }, [algos]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { effectParamsRef.current = effectParams; }, [effectParams]);

  // The recursive rAF call goes through renderFrameRef rather than naming
  // renderFrame directly inside its own body — self-referencing a const by
  // name inside its own initializer works fine at runtime (the callback
  // only actually runs after the assignment completes), but static
  // analysis can't know that, so it reads as "accessed before declared."
  // A ref sidesteps the question entirely: .current is just a property
  // read at call time, not a closure-captured binding.
  const renderFrame = useCallback(() => {
    const vid = videoRef.current, oc = outRef.current, wc = workRef.current;
    if (!vid || !oc || !wc || vid.readyState < 2) return;
    const VW = vid.videoWidth || 512, VH = vid.videoHeight || 512;
    if (wc.width !== VW) wc.width = VW;
    if (wc.height !== VH) wc.height = VH;
    if (oc.width !== VW) oc.width = VW;
    if (oc.height !== VH) oc.height = VH;
    const wctx = wc.getContext('2d');
    wctx.drawImage(vid, 0, 0, VW, VH);
    let buf = wctx.getImageData(0, 0, VW, VH).data;
    const clipSeed = seedRef.current;
    const frameSeed = seedRef.current + ((vid.currentTime * 1000) | 0);
    buf = applyVideoEffectChain(buf, algosRef.current, { W: VW, H: VH, intensity: intensityRef.current, channel: 'brightness' }, clipSeed, frameSeed, effectParamsRef.current);
    const octx = oc.getContext('2d');
    const od = octx.createImageData(VW, VH);
    od.data.set(buf);
    octx.putImageData(od, 0, 0);
    if (!vid.paused) animRef.current = requestAnimationFrame(() => renderFrameRef.current());
  }, []);
  useEffect(() => { renderFrameRef.current = renderFrame; }, [renderFrame]);

  const { exporting, captureFrame, captureFullQualityFrame, runExport, exportAudioOnly } = useVideoExport({ videoRef, workRef, outRef, renderFrame, audioTrack, seed });

  const captureFullQuality = () => {
    setFqBusy(true);
    setTimeout(() => { captureFullQualityFrame(algos, intensity, effectParams); setFqBusy(false); }, 10);
  };

  const loadVideo = useCallback((file) => {
    if (!file) return;
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.src) URL.revokeObjectURL(vid.src);
    vid.onloadedmetadata = () => {
      const oc = outRef.current;
      if (oc) { oc.width = vid.videoWidth; oc.height = vid.videoHeight; }
    };
    vid.onseeked = () => renderFrame();
    vid.src = URL.createObjectURL(file);
    vid.muted = true;
    vid.currentTime = 0;
    setVideoFile(file);
    setPlaying(false);
    audioTrack.extract(file); // fire-and-forget; fails quietly if no audio track
  }, [renderFrame, audioTrack]);

  const toggleVideo = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !videoFile) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setPlaying(true);
      animRef.current = requestAnimationFrame(renderFrame);
    } else {
      vid.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [videoFile, renderFrame]);

  const applyPreset = (k) => { const p = IMAGE_PRESETS[k]; setAlgos(p.algos); setIntensity(p.intensity); setPreset(k); };
  const toggleAlgo = (id) => { setPreset(null); setAlgos((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id])); };
  const toggleAudioAlgo = (id) => audioTrack.setAudioAlgos((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id]));

  const shuffle = () => {
    const rng = prng(Date.now() % 999999);
    setPreset(null);
    setAlgos(randomEffectSelection('video', rng));
    setIntensity(0.3 + rng() * 0.6);
  };

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (videoRef.current?.src) URL.revokeObjectURL(videoRef.current.src);
  }, []);

  const seedStr = String(seed).padStart(6, '0');

  return (
    <>
      <canvas ref={workRef} width={512} height={512} style={{ display: 'none' }} />
      <video ref={videoRef} style={{ display: 'none' }} playsInline loop
        onEnded={() => { setPlaying(false); if (animRef.current) cancelAnimationFrame(animRef.current); }} />
      <aside className="sidebar">
        <UploadZone label="VIDEO" subLabel="mp4 · webm · mov" loaded={!!videoFile} onFile={loadVideo} accept="video/*" />
        <div className="div" />
        <span className="lbl">PRESETS</span>
        <PresetPanel presets={IMAGE_PRESETS} active={preset} onSelect={applyPreset} />
        <button className="adv-toggle" onClick={() => setShowAdv((v) => !v)}>{showAdv ? '▼' : '▶'} VISUAL EFFECTS ({VIDEO_EFFECTS.length})</button>
        {showAdv && <div className="algo-scroll"><AlgoPanel effects={VIDEO_EFFECTS} active={algos} onToggle={toggleAlgo} /></div>}
        <ActiveChainList algos={algos} mediaType="video" onReorder={setAlgos} onRemove={(id) => setAlgos((p) => p.filter((a) => a !== id))} effectParams={effectParams} onParamsChange={setEffectParams} />
        <div className="div" />
        <div className="sec">
          <span className="lbl">INTENSITY — {(intensity * 100).toFixed(0)}%</span>
          <input type="range" className="slider" min=".05" max="1" step=".01"
            value={intensity} onChange={(e) => { setPreset(null); setIntensity(parseFloat(e.target.value)); }} />
        </div>
        <div className="div" />
        {videoFile && (
          <VideoAudioTrackPanel audioTrack={audioTrack} effects={AUDIO_TRACK_EFFECTS} show={showAudioTrack}
            onToggleShow={() => setShowAudioTrack((v) => !v)} onToggleAlgo={toggleAudioAlgo} />
        )}
        <div className="seed-row"><span className="seed-lbl">SEED</span><span className="seed-val">#{seedStr}</span></div>
        <button className="reroll-btn" onClick={onReroll}>⟳  NEW SEED</button>
        <ShuffleButton onClick={shuffle} />
        <CopyRecipeButton getRecipe={() => ({ t: 'video', s: seed, a: algos, i: intensity, p: effectParams })} />
      </aside>
      <main className="main">
        <canvas ref={outRef} className="video-output" width={512} height={288} />
        <div className="video-controls">
          <button className="play-btn" onClick={toggleVideo} disabled={!videoFile || exporting}>
            {playing ? '■ PAUSE' : '▶ PLAY GLITCHED'}
          </button>
          <button className="act-btn" onClick={captureFrame} disabled={!videoFile}>📷 FRAME PNG</button>
          <button className="act-btn" onClick={captureFullQuality} disabled={!videoFile || fqBusy}>
            {fqBusy ? <ScrambleText text="RENDERING" active={fqBusy} /> : '🎨 FULL QUALITY FRAME'}
          </button>
          <button className="export-btn" onClick={() => runExport(true, setPlaying)} disabled={!videoFile || exporting}>
            {exporting ? <ScrambleText text="EXPORTING" active={exporting} /> : audioTrack.hasAudio ? '⬇ EXPORT VIDEO+AUDIO' : '⬇ EXPORT VIDEO'}
          </button>
          {audioTrack.hasAudio && (
            <>
              <button className="act-btn" onClick={() => runExport(false, setPlaying)} disabled={!videoFile || exporting}>⬇ VIDEO ONLY</button>
              <button className="act-btn" onClick={exportAudioOnly} disabled={!videoFile || exporting}>⬇ AUDIO ONLY</button>
            </>
          )}
        </div>
        {!videoFile && <div className="audio-info">UPLOAD VIDEO · frames are glitched in real-time · audio track (if any) processed separately</div>}
        <div className="canvas-hint">glitch updates live as the video plays · OIL PAINT and OVERLAY effects are too slow for continuous playback, so they only apply via FULL QUALITY FRAME (a single still capture), not live preview or video export</div>
      </main>
    </>
  );
}
