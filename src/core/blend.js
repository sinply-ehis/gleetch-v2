import { clamp } from './color.js';

// Linear interpolation between two RGBA buffers.
// t=0 => a, t=1 => b. Lengths must match. Alpha is lerped identically
// so dissolve-style effects that touch alpha blend correctly too.
export function lerpBuffer(a, b, t) {
  if (t <= 0) return new Uint8ClampedArray(a);
  if (t >= 1) return new Uint8ClampedArray(b);
  const out = new Uint8ClampedArray(a.length);
  const it = 1 - t;
  for (let i = 0; i < a.length; i += 4) {
    out[i] = clamp(a[i] * it + b[i] * t, 0, 255);
    out[i + 1] = clamp(a[i + 1] * it + b[i + 1] * t, 0, 255);
    out[i + 2] = clamp(a[i + 2] * it + b[i + 2] * t, 0, 255);
    out[i + 3] = clamp(a[i + 3] * it + b[i + 3] * t, 0, 255);
  }
  return out;
}

// Convenience: apply fn at full strength then lerp by intensity.
// Use when an effect's internal math doesn't itself lerp (e.g.
// halftone, edgeSketch) — guarantees intensity 0 = identity.
export function intensityLerp(src, full, intensity) {
  if (intensity <= 0) return new Uint8ClampedArray(src);
  if (intensity >= 1) return full;
  return lerpBuffer(src, full, intensity);
}
