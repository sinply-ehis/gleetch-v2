import { clamp } from '../../core/color.js';
import { lerpBuffer } from '../../core/blend.js';
import { fbm } from '../../core/rng.js';

function lumaAt(buf, i) { return buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11; }

// Watercolor bleed — soft diffusion + paper grain, edges dissolve
export function watercolorBleed(buf, W, H, intensity, rng) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const full = new Uint8ClampedArray(buf.length);
  const seed = Math.floor(rng() * 1e9) || 1;
  // simple bloom: mix neighbor average with noise-based bleed mask
  const tmp = new Uint8ClampedArray(buf);
  // light blur pass
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const n = (buf[(y * W + x) * 4 + c] + buf[((y - 1) * W + x) * 4 + c] + buf[((y + 1) * W + x) * 4 + c] + buf[(y * W + x - 1) * 4 + c] + buf[(y * W + x + 1) * 4 + c]) / 5;
        tmp[i + c] = n;
      }
      tmp[i + 3] = 255;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const n = fbm(x * 0.02, y * 0.02, seed);
      const paper = 0.85 + n * 0.3; // paper texture modulation 0.85-1.15
      const edge = Math.abs(lumaAt(tmp, i) - lumaAt(buf, i)) / 255; // edge strength
      const bleed = Math.min(1, edge * 2.5 + (1 - n) * 0.12);
      for (let c = 0; c < 3; c++) {
        const v = tmp[i + c] * (0.72 + bleed * 0.28) * paper;
        full[i + c] = clamp(v, 0, 255);
      }
      full[i + 3] = 255;
    }
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Oil impasto — thick ridges via emboss-like height from luma
export function oilImpasto(buf, W, H, intensity) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const gray = new Float32Array(W * H);
  for (let i = 0, p = 0; i < buf.length; i += 4, p++) gray[p] = lumaAt(buf, i);
  const full = new Uint8ClampedArray(buf.length);
  const ridgeStrength = 18;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const gx = (gray[Math.min(W - 1, x + 1) + y * W] - gray[Math.max(0, x - 1) + y * W]) * 0.5;
      const gy = (gray[x + Math.min(H - 1, y + 1) * W] - gray[x + Math.max(0, y - 1) * W]) * 0.5;
      const h = Math.sqrt(gx * gx + gy * gy) / 255;
      const light = clamp(0.5 + (gx * 0.6 + gy * 0.8) / 64, 0.35, 1.15);
      const thick = 1 + h * 0.35;
      for (let c = 0; c < 3; c++) full[i + c] = clamp(buf[i + c] * light * thick, 0, 255);
      full[i + 3] = 255;
    }
  }
  // subtle quantize to mimic paint steps
  for (let i = 0; i < full.length; i += 4) {
    for (let c = 0; c < 3; c++) full[i + c] = Math.round(full[i + c] / 18) * 18;
  }
  if (intensity >= 1) return full;
  // impasto ridge strength scales with intensity via light already, but still lerp
  void ridgeStrength;
  return lerpBuffer(buf, full, intensity);
}

// Ink wash (sumi-e) — monochrome strokes, mostly negative space
export function inkWash(buf, W, H, intensity, rng) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const full = new Uint8ClampedArray(buf.length);
  const inkThresh = 0.38 + rng() * 0.18;
  const seed = Math.floor(rng() * 1e9) || 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lum = lumaAt(buf, i) / 255;
      const n = fbm(x * 0.025, y * 0.025, seed);
      // sparse strokes: only where luminance is mid-dark and noise favors
      const stroke = (1 - lum) * (0.6 + n * 0.7);
      const ink = stroke > inkThresh ? clamp(18 + stroke * 30, 0, 255) : 242 + n * 10;
      const v = ink;
      // monochrome but preserve slight tint at high intensity
      const tint = 0.92;
      full[i] = v * tint; full[i + 1] = v * tint; full[i + 2] = v; full[i + 3] = 255;
    }
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const PAINTERLY_EFFECTS = [
  { id: 'watercolorBleed', label: 'WATERCOLOR BLEED', hint: 'soft diffusion into paper texture', category: 'stylize', mediaTypes: ['image', 'video'], fn: watercolorBleed },
  { id: 'oilImpasto', label: 'OIL IMPASTO', hint: 'thick ridged brushwork', category: 'stylize', mediaTypes: ['image', 'video'], realtimeSafe: false, fn: oilImpasto },
  { id: 'inkWash', label: 'INK WASH', hint: 'sumi-e minimal monochrome strokes', category: 'stylize', mediaTypes: ['image', 'video'], fn: inkWash },
];
