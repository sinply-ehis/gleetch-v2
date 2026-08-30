import { clamp } from '../../core/color.js';
import { lerpBuffer } from '../../core/blend.js';

function lumaAt(buf, i) { return buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11; }

// Risograph — limited palette, misregistered layers
export function risograph(buf, W, H, intensity, rng) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const palette = [
    [255, 107, 107], [255, 214, 107], [107, 255, 182], [107, 180, 255], [180, 107, 255],
  ];
  const picks = [palette[Math.floor(rng() * palette.length)], palette[Math.floor(rng() * palette.length)]];
  const ox1 = Math.round((rng() * 2 - 1) * 4), oy1 = Math.round((rng() * 2 - 1) * 4);
  const ox2 = Math.round((rng() * 2 - 1) * 4), oy2 = Math.round((rng() * 2 - 1) * 4);
  const full = new Uint8ClampedArray(buf.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lum = lumaAt(buf, i) / 255;
      // quantize to 4 levels per layer
      const lvl = lum < 0.33 ? 0 : lum < 0.66 ? 0.55 : 1;
      // sample misregistered positions
      const sx1 = clamp(x + ox1, 0, W - 1), sy1 = clamp(y + oy1, 0, H - 1);
      const sx2 = clamp(x + ox2, 0, W - 1), sy2 = clamp(y + oy2, 0, H - 1);
      const l1 = lumaAt(buf, (sy1 * W + sx1) * 4) / 255;
      const l2 = lumaAt(buf, (sy2 * W + sx2) * 4) / 255;
      const a1 = l1 < 0.45 ? 1 : l1 < 0.75 ? 0.45 : 0;
      const a2 = l2 < 0.5 ? 1 : l2 < 0.82 ? 0.35 : 0;
      let r = 255 - (255 - picks[0][0]) * a1 * lvl - (255 - picks[1][0]) * a2 * lvl * 0.7;
      let g = 255 - (255 - picks[0][1]) * a1 * lvl - (255 - picks[1][1]) * a2 * lvl * 0.7;
      let b = 255 - (255 - picks[0][2]) * a1 * lvl - (255 - picks[1][2]) * a2 * lvl * 0.7;
      full[i] = clamp(r, 0, 255); full[i + 1] = clamp(g, 0, 255); full[i + 2] = clamp(b, 0, 255); full[i + 3] = 255;
    }
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Screen print blocks — flat separations, Warhol contrast
export function screenPrint(buf, W, H, intensity) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const full = new Uint8ClampedArray(buf.length);
  for (let i = 0; i < buf.length; i += 4) {
    const lum = lumaAt(buf, i) / 255;
    let r, g, b;
    if (lum < 0.25) { r = 22; g = 22; b = 28; }
    else if (lum < 0.5) { r = 255; g = 45; b = 107; }
    else if (lum < 0.75) { r = 255; g = 214; b = 0; }
    else { r = 240; g = 250; b = 255; }
    // contrast boost
    full[i] = r; full[i + 1] = g; full[i + 2] = b; full[i + 3] = 255;
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Manga screentone — halftone shading + clean linework
export function mangaScreentone(buf, W, H, intensity) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const full = new Uint8ClampedArray(buf.length);
  // edge map for linework
  const gray = new Float32Array(W * H);
  for (let i = 0, p = 0; i < buf.length; i += 4, p++) gray[p] = lumaAt(buf, i);
  const cell = 6;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // edge
      let gx = 0, gy = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = clamp(x + dx, 0, W - 1), ny = clamp(y + dy, 0, H - 1);
        const v = gray[ny * W + nx];
        const kx = [-1,0,1,-2,0,2,-1,0,1][(dy+1)*3+dx+1];
        const ky = [-1,-2,-1,0,0,0,1,2,1][(dy+1)*3+dx+1];
        gx += v * kx; gy += v * ky;
      }
      const mag = Math.sqrt(gx*gx+gy*gy);
      if (mag > 70) { full[i]=0; full[i+1]=0; full[i+2]=0; full[i+3]=255; continue; }
      const lum = gray[y * W + x] / 255;
      if (lum > 0.88) { full[i]=255; full[i+1]=255; full[i+2]=255; full[i+3]=255; continue; }
      // screentone dots for mid tones
      const cx = Math.floor(x / cell) * cell + cell/2;
      const cy = Math.floor(y / cell) * cell + cell/2;
      const dist = Math.hypot(x - cx, y - cy);
      const r = (1 - lum) * cell * 0.55;
      if (dist <= r) { full[i]=0; full[i+1]=0; full[i+2]=0; full[i+3]=255; }
      else { full[i]=255; full[i+1]=255; full[i+2]=255; full[i+3]=255; }
    }
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

// Line contour — single-weight continuous line (simplified: trace quantized edges)
export function lineContour(buf, W, H, intensity) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const full = new Uint8ClampedArray(buf.length);
  full.fill(255);
  const gray = new Float32Array(W * H);
  for (let i = 0, p = 0; i < buf.length; i += 4, p++) gray[p] = lumaAt(buf, i);
  // light edge threshold, draw as 1px black
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const gx = gray[y * W + x + 1] - gray[y * W + x - 1];
      const gy = gray[(y + 1) * W + x] - gray[(y - 1) * W + x];
      const mag = Math.sqrt(gx*gx+gy*gy);
      if (mag > 22) {
        const i = (y * W + x) * 4;
        full[i]=0; full[i+1]=0; full[i+2]=0; full[i+3]=255;
      }
    }
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

export const PRINT_EFFECTS = [
  { id: 'risograph', label: 'RISOGRAPH', hint: 'limited palette misregistered print', category: 'stylize', mediaTypes: ['image','video'], fn: risograph },
  { id: 'screenPrint', label: 'SCREEN PRINT', hint: 'Warhol flat separations', category: 'stylize', mediaTypes: ['image','video'], fn: screenPrint },
  { id: 'mangaScreentone', label: 'MANGA SCREENTONE', hint: 'halftone dots + clean linework', category: 'stylize', mediaTypes: ['image','video'], fn: mangaScreentone },
  { id: 'lineContour', label: 'LINE CONTOUR', hint: 'continuous single-weight line', category: 'stylize', mediaTypes: ['image','video'], fn: lineContour },
];
