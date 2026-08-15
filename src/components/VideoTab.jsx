import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { useQuality } from '../core/quality.jsx';

const VIDEO_EFFECTS = getEffectsFor('video');
const AUDIO_TRACK_EFFECTS = getEffectsFor('audio');

export default function VideoTab({ seed, onReroll, initialRecipe }) {
  const { current: quality } = useQuality();
  
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

  // Reused output ImageData (getImageData itself always allocates fresh)
  const outImageDataRef = useRef(null);

  // Refs for stale-closure-free RAF loop
  const algosRef = useRef(algos);
  const intensityRef = useRef(intensity);
  const seedRef = useRef(seed);
  const effectParamsRef = useRef(effectParams);
  const qualityRef = useRef(quality);
  const heavyFrameRef = useRef(0);
  useEffect(() => { algosRef.current = algos; }, [algos]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { effectParamsRef.current = effectParams; }, [effectParams]);
  useEffect(() => { qualityRef.current = quality; }, [quality]);

  // Heavy effect detection
  const hasHeavyEffect = useMemo(() => 
    algos.some(id => {
      const eff = VIDEO_EFFECTS.find(e => e.id === id);
      return eff?.realtimeSafe === false;
    }), [algos]);

  // Quality-adaptive settings
  const maxDim = quality.videoMaxDim;
  const targetFPS = quality.targetFPS;
  const frameInterval = 1000 / targetFPS;
  const heavyThrottle = quality.heavyEffectThrottle;

  // FPS-throttled RAF wrapper. renderFrame itself always renders fully
  // (capture/export call it directly with no time gate); the loop drops
  // frames between the quality tier's frameInterval instead, so a 15fps
  // tier costs a quarter of the CPU.
  const loopRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const loop = () => {
    const vid = videoRef.current;
    if (!vid || vid.paused) return;
    const now = performance.now();
    if (now - lastFrameTimeRef.current >= frameInterval) {
      lastFrameTimeRef.current = now;
      renderFrameRef.current();
    } else {
      animRef.current = requestAnimationFrame(loopRef.current);
    }
  };
  useEffect(() => { loopRef.current = loop; });

  const renderFrame = useCallback(() => {
    const vid = videoRef.current, oc = outRef.current, wc = workRef.current;
    if (!vid || !oc || !wc || vid.readyState < 2) return;
    
    const VW = Math.min(vid.videoWidth || 512, maxDim);
    const VH = Math.min(vid.videoHeight || 512, maxDim);
    if (wc.width !== VW) wc.width = VW;
    if (wc.height !== VH) wc.height = VH;
    if (oc.width !== VW) oc.width = VW;
    if (oc.height !== VH) oc.height = VH;

    const wctx = wc.getContext('2d', { willReadFrequently: true });
    wctx.drawImage(vid, 0, 0, VW, VH);

    // getImageData always returns a fresh ImageData — the reuse win is
    // the work canvas + the output ImageData, not this read.
    let buf = wctx.getImageData(0, 0, VW, VH).data;

    const clipSeed = seedRef.current;
    const frameSeed = seedRef.current + ((vid.currentTime * 1000) | 0);
    
    // Throttle heavy effects with an integer frame counter — currentTime is
    // fractional, so (currentTime * fps) % throttle almost never hits 0 and
    // heavy effects silently vanish mid-playback. Count rendered frames
    // instead, and honor the quality tier's enableHeavyEffects gate.
    const throttle = qualityRef.current.heavyEffectThrottle;
    const shouldProcessHeavy = qualityRef.current.enableHeavyEffects && hasHeavyEffect &&
      (throttle === 1 || heavyFrameRef.current % throttle === 0);
    heavyFrameRef.current++;

    buf = applyVideoEffectChain(buf, algosRef.current, { 
      W: VW, H: VH, intensity: intensityRef.current, channel: 'brightness' 
    }, clipSeed, frameSeed, effectParamsRef.current, shouldProcessHeavy);

    // Reuse output ImageData
    let outImgData = outImageDataRef.current;
    if (!outImgData || outImgData.width !== VW || outImgData.height !== VH) {
      outImgData = oc.getContext('2d').createImageData(VW, VH);
      outImageDataRef.current = outImgData;
    }
    outImgData.data.set(buf);
    oc.getContext('2d').putImageData(outImgData, 0, 0);

    if (!vid.paused) animRef.current = requestAnimationFrame(loopRef.current);
  }, [maxDim, hasHeavyEffect]);

  useEffect(() => { renderFrameRef.current = renderFrame; }, [renderFrame]);

  const { exporting, captureFrame, captureFullQualityFrame, runExport, exportAudioOnly } = useVideoExport({ 
    videoRef, workRef, outRef, renderFrame, audioTrack, seed, maxDim 
  });

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
      if (oc) { oc.width = Math.min(vid.videoWidth, maxDim); oc.height = Math.min(vid.videoHeight, maxDim); }
    };
    vid.onseeked = () => renderFrame();
    vid.src = URL.createObjectURL(file);
    vid.muted = true;
    vid.currentTime = 0;
    setVideoFile(file);
    setPlaying(false);
    audioTrack.extract(file);
  }, [renderFrame, audioTrack, maxDim]);

  const toggleVideo = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !videoFile) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setPlaying(true);
      lastFrameTimeRef.current = 0;
      animRef.current = requestAnimationFrame(loopRef.current);
    } else {
      vid.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [videoFile]);

  const applyPreset = (k) => { const p = IMAGE_PRESETS[k]; setAlgos(p.algos); setIntensity(p.intensity); setPreset(k); };
  const toggleAlgo = (id) => { setPreset(null); setAlgos((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id])); };
  const toggleAudioAlgo = (id) => audioTrack.setAudioAlgos((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id]));

  const shuffle = () => {
    const rng = prng(Date.now() % 999999);
    setPreset(null);
    setAlgos(randomEffectSelection('video', rng, { exclude: algos }));
    setIntensity(0.3 + rng() * 0.6);
  };

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (videoRef.current?.src) URL.revokeObjectURL(videoRef.current.src);
  }, []);

  const seedStr = String(seed).padStart(6, '0');

  return (
    <>
      <canvas ref={workRef} style={{ display: 'none' }} />
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
        <div className="canvas-hint">quality: {quality.name} · max dim: {maxDim}px · {hasHeavyEffect && !quality.enableHeavyEffects ? 'heavy effects disabled' : hasHeavyEffect ? `throttled (1/${heavyThrottle} frames)` : 'all effects real-time'}</div>
      </main>
    </>
  );
}