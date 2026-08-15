import { clamp, hexToRgb } from '../../core/color.js';

// Presence-family overlays — the replacements for the removed
// PHANTOM FACE slot. Three eerie per-pixel overlays that fill the same
// gap without being a face:
//   void    — a black eclipse with a wavy burning rim ("the signal is
//             being eaten")
//   sigil   — a glowing alien glyph: ring, radial spokes, core dot
//   wraith  — a dark vertical smear that drags the image behind it
// All three are pure distance-field math (no DOM, no pattern lookup), so
// they're cheap enough for real-time video — deliberately NOT tagged
// realtimeSafe:false — and pick their style once per clip
// (stableAcrossFrames). They share one param shape (position/size/glow/
// color) so the app's generic ParamControls and the landing page's drag
// system both drive them. All three are identity at intensity 0 and never
// write to the input buffer.

const blendChannel = (v, target, a) => v * (1 - a) + target * a;

function glowRgb(params, fallback) {
  return params?.glowColor ? hexToRgb(params.glowColor) : fallback;
}

export function voidPresence(buf, W, H, intensity, rng, params) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const cx = (params?.posX ?? 0.5) * W;
  const cy = (params?.posY ?? 0.5) * H;
  const radius = Math.max(1, Math.min(W, H) * (params?.size ?? 0.3));
  const rimWidth = radius * 0.14;
  const glowStrength = params?.glowIntensity ?? 0.8;
  const [gr, gg, gb] = glowRgb(params, [232, 212, 255]);
  // Style picked once per clip: rim wobble phase/lobes stay fixed while
  // the video plays, so the eclipse doesn't shiver frame to frame.
  const rimWaves = 2 + Math.floor(rng() * 3);
  const rimPhase = rng() * Math.PI * 2;
  const rimWobble = 0.08 + rng() * 0.1;
  const out = new Uint8ClampedArray(buf.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      let r = buf[i], g = buf[i + 1], b = buf[i + 2];
      // Core: fall off from center to radius, toward a near-black tint
      // of the glow color — the void dims the image into itself.
      const coreA = clamp(1 - d / radius, 0, 1) * intensity * 0.9;
      if (coreA > 0) {
        r = blendChannel(r, gr * 0.1, coreA);
        g = blendChannel(g, gg * 0.1, coreA);
        b = blendChannel(b, gb * 0.1, coreA);
      }
      // Rim: a burning edge just past the core radius, wavy with angular
      // lobes so it reads organic rather than a perfect circle.
      const ang = Math.atan2(dy, dx);
      const wobble = 1 + Math.sin(ang * rimWaves + rimPhase) * rimWobble;
      const rimA = clamp(1 - (d - radius * wobble) / rimWidth, 0, 1) * intensity * glowStrength;
      if (rimA > 0) {
        r = blendChannel(r, gr, rimA);
        g = blendChannel(g, gg, rimA);
        b = blendChannel(b, gb, rimA);
      }
      out[i] = clamp(r, 0, 255);
      out[i + 1] = clamp(g, 0, 255);
      out[i + 2] = clamp(b, 0, 255);
      out[i + 3] = buf[i + 3];
    }
  }
  return out;
}

export function sigilPresence(buf, W, H, intensity, rng, params) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const cx = (params?.posX ?? 0.5) * W;
  const cy = (params?.posY ?? 0.5) * H;
  const ringR = Math.max(1, Math.min(W, H) * (params?.size ?? 0.3));
  const glowStrength = params?.glowIntensity ?? 0.8;
  const [gr, gg, gb] = glowRgb(params, [0, 229, 255]);
  // Style picked once per clip: odd spoke count keeps the glyph balanced,
  // rotation/spoke width/arm length fix the exact rune.
  const spokeCount = 5 + Math.floor(rng() % 3) * 2;
  const rotation = rng() * Math.PI * 2;
  const spokeHalf = 0.08 + rng() * 0.06;
  const spokeLen = ringR * (0.7 + rng() * 0.4);
  const dotR = ringR * 0.16;
  const ringEdge = ringR * 0.07;
  const out = new Uint8ClampedArray(buf.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const r = d / ringR;
      const ang = Math.atan2(dy, dx) - rotation;
      let g = 0;
      // Ring band
      g = Math.max(g, clamp(1 - Math.abs(r - 1) / (ringEdge / ringR), 0, 1));
      // Core dot
      g = Math.max(g, clamp(1 - d / dotR, 0, 1));
      // Radial spokes
      for (let s = 0; s < spokeCount; s++) {
        const da = Math.abs(ang - (s / spokeCount) * Math.PI * 2);
        const daN = Math.min(da, Math.PI * 2 - da);
        if (daN < spokeHalf) {
          const angA = 1 - daN / spokeHalf;
          const lenA = clamp(1 - (r - 1) / (spokeLen / ringR), 0, 1);
          g = Math.max(g, angA * lenA);
        }
      }
      const a = g * intensity * glowStrength;
      if (a > 0) {
        out[i] = clamp(blendChannel(buf[i], gr, a), 0, 255);
        out[i + 1] = clamp(blendChannel(buf[i + 1], gg, a), 0, 255);
        out[i + 2] = clamp(blendChannel(buf[i + 2], gb, a), 0, 255);
        out[i + 3] = buf[i + 3];
      } else {
        out[i] = buf[i]; out[i + 1] = buf[i + 1]; out[i + 2] = buf[i + 2]; out[i + 3] = buf[i + 3];
      }
    }
  }
  return out;
}

export function wraithPresence(buf, W, H, intensity, rng, params) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const cx = (params?.posX ?? 0.5) * W;
  const cy = (params?.posY ?? 0.5) * H;
  const height = Math.max(1, Math.min(W, H) * (params?.size ?? 0.5) * 1.6);
  const width = height * (0.3 + rng() * 0.12);
  const glowStrength = params?.glowIntensity ?? 0.8;
  const [gr, gg, gb] = glowRgb(params, [110, 110, 158]);
  // Style picked once per clip: how hard it smears vertically and how
  // hard it pulls the image toward its spine.
  const stretch = 0.5 + rng() * 0.3;
  const pull = 0.35 + rng() * 0.25;
  const out = new Uint8ClampedArray(buf.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dx = (x - cx) / width, dy = (y - cy) / height;
      const f = clamp(1 - Math.sqrt(dx * dx + dy * dy), 0, 1);
      if (f <= 0) {
        out[i] = buf[i]; out[i + 1] = buf[i + 1]; out[i + 2] = buf[i + 2]; out[i + 3] = buf[i + 3];
        continue;
      }
      // Taper: the smear is narrower near the top, wider near the base.
      const taper = 0.6 + 0.4 * clamp((y - cy + height) / (height * 2), 0, 1);
      const sx = cx + dx * width * taper * (1 - f * pull * intensity);
      const sy = y + dy * f * height * stretch * intensity * 0.25;
      const si = (clamp(Math.round(sy), 0, H - 1) * W + clamp(Math.round(sx), 0, W - 1)) * 4;
      const dark = f * intensity * 0.65;
      let r = blendChannel(buf[si], gr * 0.25, dark);
      let g = blendChannel(buf[si + 1], gg * 0.25, dark);
      let b = blendChannel(buf[si + 2], gb * 0.25, dark);
      const edge = f * intensity * glowStrength * 0.35;
      r = blendChannel(r, gr, edge);
      g = blendChannel(g, gg, edge);
      b = blendChannel(b, gb, edge);
      out[i] = clamp(r, 0, 255);
      out[i + 1] = clamp(g, 0, 255);
      out[i + 2] = clamp(b, 0, 255);
      out[i + 3] = buf[i + 3];
    }
  }
  return out;
}

export const PRESENCE_EFFECTS = [
  { id: 'void', label: 'VOID', hint: 'a black eclipse with a burning rim eats the image', category: 'overlay', mediaTypes: ['image', 'video'], stableAcrossFrames: true, fn: voidPresence, params: presenceParams('#E8D4FF') },
  { id: 'sigil', label: 'SIGIL', hint: 'a glowing alien glyph — ring, spokes, core', category: 'overlay', mediaTypes: ['image', 'video'], stableAcrossFrames: true, fn: sigilPresence, params: presenceParams('#00E5FF') },
  { id: 'wraith', label: 'WRAITH', hint: 'a dark presence smears and drags the image behind it', category: 'overlay', mediaTypes: ['image', 'video'], stableAcrossFrames: true, fn: wraithPresence, params: presenceParams('#6E6E9E') },
];

function presenceParams(glowColor) {
  return [
    { key: 'posX', type: 'range', label: 'POS X', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'posY', type: 'range', label: 'POS Y', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'size', type: 'range', label: 'SIZE', default: 0.3, min: 0.1, max: 0.7, step: 0.01 },
    { key: 'glowIntensity', type: 'range', label: 'GLOW', default: 0.8, min: 0.2, max: 1.5, step: 0.05 },
    { key: 'glowColor', type: 'color', label: 'COLOR', default: glowColor },
  ];
}
