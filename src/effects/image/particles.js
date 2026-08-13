import { clamp, hexToRgb } from '../../core/color.js';
import { fbm } from '../../core/rng.js';

// Coherent-noise threshold dissolve: an fbm noise field decides which
// pixels have "disintegrated" (alpha to 0). Pixels sitting right at the
// threshold boundary get tinted toward particleColor and partly faded
// before they fully vanish — a glowing-edge disintegration look rather
// than a flat, hard-edged cutout.
//
// Deliberately left off `stableAcrossFrames`: unlike voronoi's cell
// layout (a one-time style choice), the dissolve pattern is meant to
// shimmer and evolve as video plays — same "alive frame to frame"
// territory as the other decay/glitch effects, not a fixed style pick.
export function particleDissolve(buf, W, H, intensity, rng, params) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const density = params?.density ?? 0.5;
  const edgeSoftness = params?.edgeSoftness ?? 0.14;
  const edgeRgb = params?.particleColor ? hexToRgb(params.particleColor) : null;
  const seed = Math.floor(rng() * 1e9) || 1;
  const cell = 70 - intensity * 40; // higher intensity = finer, smaller dissolve clumps

  const out = new Uint8ClampedArray(buf.length);
  out.set(buf);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x / cell, y / cell, seed);
      if (n >= density + edgeSoftness) continue; // untouched, still-solid region
      const i = (y * W + x) * 4;
      if (n < density) {
        out[i + 3] = 0;
        continue;
      }
      const t = 1 - (n - density) / edgeSoftness; // 1 at the dissolve line, 0 at the band's outer edge
      if (edgeRgb) {
        out[i] = clamp(buf[i] + (edgeRgb[0] - buf[i]) * t, 0, 255);
        out[i + 1] = clamp(buf[i + 1] + (edgeRgb[1] - buf[i + 1]) * t, 0, 255);
        out[i + 2] = clamp(buf[i + 2] + (edgeRgb[2] - buf[i + 2]) * t, 0, 255);
      }
      out[i + 3] = clamp(buf[i + 3] * (1 - t * 0.4), 0, 255);
    }
  }
  return out;
}

export const PARTICLE_EFFECTS = [
  {
    id: 'particleDissolve', label: 'PARTICLE DISSOLVE', hint: 'noise-threshold disintegration, glowing edge optional (full-quality frame capture only)', category: 'stylize', mediaTypes: ['image', 'video'], realtimeSafe: false, fn: particleDissolve,
    params: [
      { key: 'density', type: 'range', label: 'DISSOLVE', default: 0.5, min: 0, max: 0.9, step: 0.05 },
      { key: 'edgeSoftness', type: 'range', label: 'EDGE WIDTH', default: 0.14, min: 0.02, max: 0.3, step: 0.02 },
      { key: 'particleColor', type: 'color', label: 'EDGE COLOR', default: '#00E5FF' },
    ],
  },
];
