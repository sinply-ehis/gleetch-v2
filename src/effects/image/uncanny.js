import { clamp, hsl2rgb } from '../../core/color.js';
import { pareidoliaGlitch, faceParams, FACE_SETTINGS } from './pareidolia.js';

// A procedurally-generated, asymmetric, ghostly face — two glowing eyes and
// a wavy glowing mouth-line, blended into the image. This is pure per-pixel
// math (distance fields for the eyes, a sine-wobbled line for the mouth),
// not a canvas-drawn shape composited afterward — unlike the pattern-based
// OVERLAY effects (which need document.createElement('canvas') and are
// image-only because some of the 100 patterns are too slow for real-time
// video), this has no DOM dependency and is cheap enough to run every video
// frame. It's deliberately NOT a realistic face — glitch-art "something is
// looking back at you from the noise," not a cartoon or an emoji.
export function phantomFace(buf, W, H, intensity, rng) {
  const out = new Uint8ClampedArray(buf);
  const cx = W / 2 + (rng() - 0.5) * W * 0.12;
  const cy = H / 2 + (rng() - 0.5) * H * 0.1;
  const scale = Math.min(W, H) * (0.28 + rng() * 0.12);
  const asym = (rng() - 0.5) * 0.25;
  const eyeSpacing = scale * 0.42;
  const eyeY = cy - scale * 0.12;
  const eyeRX = scale * (0.15 + rng() * 0.05);
  const eyeRY = scale * (0.09 + rng() * 0.03);
  const mouthY = cy + scale * 0.42;
  const mouthHalfW = scale * 0.42;
  const mouthWobbleSeed = rng() * 1000;
  const mouthThickness = scale * 0.025;
  const hue = rng() * 360;
  const [glowR, glowG, glowB] = hsl2rgb(hue, 25, 88);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let glow = 0;
      for (const side of [-1, 1]) {
        const ex = cx + side * eyeSpacing * (1 + asym * side);
        const dx = (x - ex) / eyeRX, dy = (y - eyeY) / eyeRY;
        const d = dx * dx + dy * dy;
        if (d < 1) glow = Math.max(glow, 1 - d);
      }
      if (Math.abs(x - cx) < mouthHalfW) {
        const t = (x - cx + mouthHalfW) / (mouthHalfW * 2);
        const waveY = mouthY + Math.sin(t * 10 + mouthWobbleSeed) * scale * 0.03;
        const distToMouth = Math.abs(y - waveY);
        if (distToMouth < mouthThickness) glow = Math.max(glow, 1 - distToMouth / mouthThickness);
      }
      if (glow > 0.02) {
        const i = (y * W + x) * 4;
        const a = glow * intensity;
        out[i] = clamp(out[i] * (1 - a) + glowR * a, 0, 255);
        out[i + 1] = clamp(out[i + 1] * (1 - a) + glowG * a, 0, 255);
        out[i + 2] = clamp(out[i + 2] * (1 - a) + glowB * a, 0, 255);
      }
    }
  }
  return out;
}

export const UNCANNY_EFFECTS = [
  { id: 'phantomFace', label: 'PHANTOM FACE', hint: 'a ghostly face emerges', category: 'overlay', mediaTypes: ['image', 'video'], stableAcrossFrames: true, fn: phantomFace },
];

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
