import { pareidoliaGlitch, faceParams, FACE_SETTINGS } from './pareidolia.js';

export const UNCANNY_EFFECTS = [];

// --- Pareidolia displacement family ---------------------------------------
// All four share the pareidoliaGlitch core with different face geometry
// (FACE_SETTINGS) and per-effect default params (faceParams). They follow
// the established "full-quality frame capture only" tier (like voronoi,
// oilPaint): tagged for video with realtimeSafe:false so they're selectable
// in the Video tab but skipped during live playback — the per-pixel
// atan2/sqrt/pow is far too slow for real-time, and the design is "scary
// still", not animated.
function faceEffect(id, label, hint, faceName) {
  return {
    id, label, hint, category: 'overlay', mediaTypes: ['image', 'video'], realtimeSafe: false, stableAcrossFrames: true,
    fn: (buf, W, H, intensity, rng, params) => pareidoliaGlitch(buf, W, H, intensity, rng, params, FACE_SETTINGS[faceName]),
    params: faceParams(faceName),
  };
}

UNCANNY_EFFECTS.push(
  faceEffect('modularMask', 'MODULAR MASK', 'layered fractal mask', 'modularMask'),
  faceEffect('anomalousSpasm', 'ANOMALOUS SPASM', 'tangent-spike seizure', 'anomalousSpasm'),
  faceEffect('screamVortex', 'SCREAM VORTEX', 'polar melt toward a face', 'screamVortex'),
);
