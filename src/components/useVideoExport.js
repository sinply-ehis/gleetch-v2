import { useState, useCallback } from 'react';
import { prng } from '../core/rng.js';
import { encodeWAV } from '../core/wav-encoder.js';
import { processAudioBuffer } from '../effects/audio/process-buffer.js';
import { applyEffectChain } from '../effects/registry.js';
import { exportVideo, prepareAudioTrack } from '../effects/video/export.js';

export function useVideoExport({ videoRef, workRef, outRef, renderFrame, audioTrack, seed }) {
  const [exporting, setExporting] = useState(false);

  const captureFrame = useCallback(() => {
    const oc = outRef.current;
    if (!oc) return;
    const a = document.createElement('a');
    a.href = oc.toDataURL();
    a.download = `gleetch-frame-${String(seed).padStart(6, '0')}.png`;
    a.click();
  }, [outRef, seed]);

  // Re-renders the CURRENT frame from scratch using applyEffectChain
  // directly (not applyVideoEffectChain) — that means it runs the full
  // active chain unfiltered, including realtimeSafe:false effects like
  // OIL PAINT and the OVERLAY set, which are too slow for continuous
  // 30fps playback but perfectly fine for a one-off still capture. Draws
  // to a fresh offscreen canvas rather than the visible output canvas, so
  // it doesn't leave the live preview showing a stale/different frame.
  const captureFullQualityFrame = useCallback((algos, intensity, effectParams) => {
    const vid = videoRef.current, wc = workRef.current;
    if (!vid || !wc || vid.readyState < 2) return;
    const VW = vid.videoWidth || 512, VH = vid.videoHeight || 512;
    const wctx = wc.getContext('2d');
    wctx.drawImage(vid, 0, 0, VW, VH);
    let buf = wctx.getImageData(0, 0, VW, VH).data;
    const frameSeed = seed + ((vid.currentTime * 1000) | 0);
    buf = applyEffectChain(buf, algos, { mediaType: 'image', W: VW, H: VH, intensity, channel: 'brightness' }, prng(frameSeed), effectParams);
    const tmp = document.createElement('canvas');
    tmp.width = VW; tmp.height = VH;
    const tctx = tmp.getContext('2d');
    const od = tctx.createImageData(VW, VH);
    od.data.set(buf);
    tctx.putImageData(od, 0, 0);
    const a = document.createElement('a');
    a.href = tmp.toDataURL();
    a.download = `gleetch-frame-fullquality-${String(seed).padStart(6, '0')}.png`;
    a.click();
  }, [videoRef, workRef, seed]);

  const runExport = useCallback(async (withAudio, setPlaying) => {
    const vid = videoRef.current, oc = outRef.current;
    if (!vid || !oc) return;
    setExporting(true);
    setPlaying(true);
    try {
      let audioSetup;
      if (withAudio && audioTrack.audioBuffer) {
        const ctx = audioTrack.audioCtxRef.current;
        const processed = processAudioBuffer(ctx, audioTrack.audioBuffer, audioTrack.audioAlgos, audioTrack.audioIntensity, seed, audioTrack.audioEffectParams);
        audioSetup = prepareAudioTrack(ctx, processed);
      }
      const blob = await exportVideo(vid, oc, renderFrame, audioSetup);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gleetch-video-${String(seed).padStart(6, '0')}.webm`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Video export failed:', e);
    }
    setPlaying(false);
    setExporting(false);
  }, [videoRef, outRef, renderFrame, seed, audioTrack]);

  const exportAudioOnly = useCallback(() => {
    if (!audioTrack.audioBuffer || !audioTrack.audioCtxRef.current) return;
    const processed = processAudioBuffer(audioTrack.audioCtxRef.current, audioTrack.audioBuffer, audioTrack.audioAlgos, audioTrack.audioIntensity, seed, audioTrack.audioEffectParams);
    const blob = new Blob([encodeWAV(processed)], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gleetch-video-audio-${String(seed).padStart(6, '0')}.wav`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [audioTrack, seed]);

  return { exporting, captureFrame, captureFullQualityFrame, runExport, exportAudioOnly };
}
