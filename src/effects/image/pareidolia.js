// PURPOSE: Face-sensing displacement engine (the "pareidolia" family).
// OWNS: faceParams(), FACE_DEFAULTS, FACE_SETTINGS, pareidoliaGlitch().
// READ-WHEN: adding/tuning a pareidolia effect, or debugging its math.
// KEY-FILES: uncanny.js (registry), color-tone.js (applyColorRemap).
// INVARIANTS: outputs a full Uint8ClampedArray; never writes to the input
//   buf; identity output (input pixels untouched) when chaos=0, split=0,
//   color=Native and levels=64, regardless of intensity.
// GOTCHAS: per-pixel atan2/sqrt/pow — capture-only (realtimeSafe:false),
//   and designed "scary still": stableAcrossFrames. The wave math is a
//   faithful port of the reference pareidolia engine
//   (waveDisplacement + feature-distance field), kept as-is including its
//   quirks.
// UPDATED: 2026-08-13
import { applyColorRemap } from './color-tone.js';

const WAVE_OPTIONS = [
  { value: 'sin_r', label: 'Orbit Sine' },
  { value: 'mod_chaos', label: 'Bitwise Mod' },
  { value: 'tangent_spike', label: 'Tangent Spikes' },
  { value: 'polar_spiral', label: 'Polar Spiral' },
  { value: 'fractal_sin', label: 'Layered Fractal' },
];
const COLOR_OPTIONS = [
  { value: 'none', label: 'Native' },
  { value: 'cyberTint', label: 'Cyber Tint' },
  { value: 'monochrome', label: 'Monochrome' },
  { value: 'thermal', label: 'Thermal' },
  { value: 'solarize', label: 'Solarize' },
  { value: 'sineGradient', label: 'Sine Remap' },
];

// Geometric layout of each face: how the virtual features (two eyes + mouth)
// are placed and whether the field mirrors around the horizontal center.
export const FACE_SETTINGS = {
  phantomFace: { scale: 0.45, eyeDist: 0.25, mouthY: 0.3, mirror: true },
  modularMask: { scale: 0.75, eyeDist: 0.35, mouthY: 0.45, mirror: true },
  anomalousSpasm: { scale: 0.3, eyeDist: 0.15, mouthY: 0.2, mirror: false },
  screamVortex: { scale: 1.1, eyeDist: 0.1, mouthY: 0.55, mirror: false },
};

// Default param values per face, so each effect opens with its own look
// instead of a one-size-fits-all preset.
export const FACE_DEFAULTS = {
  phantomFace: { algo: 'sin_r', power: 1.8, chaos: 40, dispersion: 12, colorMode: 'none' },
  modularMask: { algo: 'fractal_sin', power: 3.2, chaos: 90, dispersion: 25, colorMode: 'cyberTint' },
  anomalousSpasm: { algo: 'tangent_spike', power: 4.0, chaos: 180, dispersion: 40, colorMode: 'solarize' },
  screamVortex: { algo: 'polar_spiral', power: 2.5, chaos: 120, dispersion: 15, colorMode: 'thermal' },
};

// Builds the params schema for one face effect (the only part the registry
// needs). The engine defaults below mirror phantomFace so direct calls
// without params still behave sanely.
export function faceParams(name) {
  const d = FACE_DEFAULTS[name];
  return [
    { key: 'algo', type: 'select', label: 'WAVE', default: d.algo, options: WAVE_OPTIONS },
    { key: 'power', type: 'range', label: 'PULL', default: d.power, min: 0.5, max: 4.5, step: 0.1 },
    { key: 'chaos', type: 'range', label: 'CHAOS', default: d.chaos, min: 0, max: 200, step: 1 },
    { key: 'dispersion', type: 'range', label: 'SPLIT', default: d.dispersion, min: 0, max: 40, step: 1 },
    { key: 'colorMode', type: 'select', label: 'COLOR', default: d.colorMode, options: COLOR_OPTIONS },
    { key: 'levels', type: 'range', label: 'LEVELS', default: 64, min: 2, max: 64, step: 1 },
  ];
}

// Wave function family, ported verbatim from the reference engine. Each
// returns a value in roughly [-1, 1] that drives the displacement vector.
function waveDisplacement(algo, dist, nx, angle, width, height, frequency, time) {
  switch (algo) {
    case 'sin_r':
      return Math.sin(dist * frequency - time);
    case 'tangent_spike':
      return Math.tan(Math.cos(dist * frequency) - time) * 0.4;
    case 'mod_chaos': {
      const modVal = Math.max(1, Math.round(frequency));
      return (((Math.floor(nx * width) ^ Math.floor(angle * height)) % modVal) / modVal) * 1.5 - 0.75;
    }
    case 'polar_spiral':
      return Math.sin(angle * 3.0 + dist * frequency - time);
    case 'fractal_sin':
      return Math.sin(dist * frequency - time) * 0.6
        + Math.sin(dist * frequency * 2.3 + time) * 0.3
        + Math.sin(dist * frequency * 4.7) * 0.1;
    default:
      return 0;
  }
}

// Clamped bilinear-free point sample with nearest-neighbor rounding and
// hard edge clamping (matches the reference's bounds-check behavior).
function sampleChannel(src, W, H, x, y, c) {
  const ix = Math.round(x), iy = Math.round(y);
  const px = ix < 0 ? 0 : ix >= W ? W - 1 : ix;
  const py = iy < 0 ? 0 : iy >= H ? H - 1 : iy;
  return src[(py * W + px) * 4 + c];
}

// The displacement core, shared by all four face effects. Every pixel is
// pushed by a vector whose magnitude = wave(feature distance) * tension *
// envelope * intensity * chaos; a 1-D vector per color channel
// (+/-dispersion) creates the chromatic splitting.
export function pareidoliaGlitch(buf, W, H, intensity, rng, params, face) {
  const out = new Uint8ClampedArray(buf.length);
  const time = rng() * 100;
  const frequency = 5 + rng() * 35;
  const algo = params?.algo ?? 'sin_r';
  const power = params?.power ?? 1.8;
  const chaos = params?.chaos ?? 40;
  const dispersion = params?.dispersion ?? 12;
  const colorMode = params?.colorMode ?? 'none';
  const levels = params?.levels ?? 64;
  const tX = 0.5, tY = 0.5;
  const { scale, eyeDist, mouthY, mirror } = face;
  const needAngle = algo === 'polar_spiral' || algo === 'mod_chaos';

  for (let y = 0; y < H; y++) {
    const ny = y / H;
    const dyV = ny - tY;
    const eyeDY = dyV - 0.15;
    const mouthDY = dyV - mouthY;
    for (let x = 0; x < W; x++) {
      const nx = x / W;
      const dxV = mirror ? Math.abs(nx - tX) : nx - tX;
      const dx2 = dxV * dxV;
      const eyeL = dxV - eyeDist, eyeR = dxV + eyeDist;
      const eyeOrbit = Math.sqrt(Math.min(eyeL * eyeL + eyeDY * eyeDY, eyeR * eyeR + eyeDY * eyeDY)) / scale;
      const mouthOrbit = Math.max(Math.abs(dxV) * 1.5, Math.abs(mouthDY) * 4.0) / scale;
      const faceField = Math.min(eyeOrbit, mouthOrbit);
      const tension = Math.pow(Math.max(0.001, faceField), -power);
      const envelope = 1.0 / (1.0 + (dx2 + dyV * dyV) * 4.0);
      const factor = tension * envelope * intensity;
      const dist = Math.sqrt(dx2 + dyV * dyV);
      const angle = needAngle ? Math.atan2(dyV, dxV) : 0;
      const wave = waveDisplacement(algo, dist, nx, angle, W, H, frequency, time);
      const vec = wave * factor * chaos;
      const disp = dispersion * Math.min(5.0, factor);
      const i = (y * W + x) * 4;
      const r = sampleChannel(buf, W, H, x + vec + disp, y + vec * 0.5, 0);
      const g = sampleChannel(buf, W, H, x + vec, y, 1);
      const b = sampleChannel(buf, W, H, x + vec - disp, y - vec * 0.5, 2);
      let rr = r, gg = g, bb = b;
      if (colorMode !== 'none') {
        const luma = rr * 0.299 + gg * 0.587 + bb * 0.114;
        [rr, gg, bb] = applyColorRemap(colorMode, rr, gg, bb, luma, time);
      }
      if (levels < 64) {
        rr = Math.round(rr / 255 * levels) * (255 / levels);
        gg = Math.round(gg / 255 * levels) * (255 / levels);
        bb = Math.round(bb / 255 * levels) * (255 / levels);
      }
      out[i] = clampChannel(rr);
      out[i + 1] = clampChannel(gg);
      out[i + 2] = clampChannel(bb);
      out[i + 3] = 255;
    }
  }
  return out;
}

function clampChannel(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
