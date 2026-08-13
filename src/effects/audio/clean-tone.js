import { clamp } from '../../core/color.js';

// One-pole low-pass filter — smooths high frequencies for a warm, muffled
// tape-like tone. Clean and artifact-free, unlike BIT CRUSH's quantization
// noise or OVERDRIVE's harmonic distortion.
export function warmLowpass(ch, sr, intensity) {
  if (intensity <= 0) return new Float32Array(ch);
  const out = new Float32Array(ch.length);
  const cutoffHz = 8000 * Math.pow(0.05, intensity); // 8000Hz (off) down to ~400Hz (full)
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoffHz) / sr);
  let prev = 0;
  for (let i = 0; i < ch.length; i++) {
    prev = prev + alpha * (ch[i] - prev);
    out[i] = prev;
  }
  return out;
}

// A real dynamics-based compressor (envelope follower + gain reduction),
// not a static waveshaper — genuinely different mechanism from OVERDRIVE's
// tanh saturation. Produces a "leveled/polished" sound, not a distorted one.
export function softCompress(ch, sr, intensity) {
  if (intensity <= 0) return new Float32Array(ch);
  const out = new Float32Array(ch.length);
  const threshold = 0.5 - intensity * 0.3;
  const ratio = 2 + intensity * 6;
  const attackCoef = Math.exp(-1 / (sr * 0.005));
  const releaseCoef = Math.exp(-1 / (sr * 0.08));
  let envelope = 0;
  for (let i = 0; i < ch.length; i++) {
    const level = Math.abs(ch[i]);
    envelope = level > envelope ? attackCoef * envelope + (1 - attackCoef) * level : releaseCoef * envelope + (1 - releaseCoef) * level;
    let targetGain = 1;
    if (envelope > threshold && envelope > 0) {
      const desiredEnvelope = threshold + (envelope - threshold) / ratio;
      targetGain = desiredEnvelope / envelope;
    }
    out[i] = clamp(ch[i] * targetGain, -1, 1);
  }
  return out;
}

// Smooth, small-depth pitch modulation via linearly-interpolated fractional
// delay — genuinely different from TAPE WOBBLE's nearest-neighbor lookup
// with a much larger, un-interpolated offset (that's what gives tape
// wobble its glitchy/aliased character). This one is smooth chorus-like
// warmth, not a corruption artifact.
export function subtleVibrato(ch, sr, intensity, rng) {
  const out = new Float32Array(ch.length);
  const depth = intensity * sr * 0.002; // up to ~2ms
  const rate = 4 + rng() * 3;
  for (let i = 0; i < ch.length; i++) {
    const offset = depth * Math.sin((2 * Math.PI * rate * i) / sr);
    const srcPos = clamp(i - offset, 0, ch.length - 1);
    const i0 = Math.floor(srcPos), i1 = Math.min(i0 + 1, ch.length - 1);
    const frac = srcPos - i0;
    out[i] = ch[i0] * (1 - frac) + ch[i1] * frac;
  }
  return out;
}

// Smooth fade-in and fade-out envelope at the buffer's edges — a clean
// "edit" style effect, not a corruption one. Duration scales with intensity.
export function gentleFade(ch, sr, intensity) {
  if (intensity <= 0) return new Float32Array(ch);
  const out = new Float32Array(ch);
  const fadeSamples = Math.floor(intensity * sr * 0.5);
  if (fadeSamples < 1) return out;
  const n = Math.min(fadeSamples, Math.floor(ch.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    out[i] *= g;
    out[ch.length - 1 - i] *= g;
  }
  return out;
}

export const AUDIO_CLEAN_TONE_EFFECTS = [
  { id: 'warmLowpass', label: 'WARM LOWPASS', hint: 'gentle high-frequency rolloff', category: 'clean-tone', mediaTypes: ['audio'], fn: warmLowpass },
  { id: 'softCompress', label: 'SOFT COMPRESS', hint: 'dynamics-based leveling', category: 'clean-tone', mediaTypes: ['audio'], fn: softCompress },
  { id: 'subtleVibrato', label: 'SUBTLE VIBRATO', hint: 'smooth interpolated pitch warmth', category: 'clean-tone', mediaTypes: ['audio'], fn: subtleVibrato },
  { id: 'gentleFade', label: 'GENTLE FADE', hint: 'smooth in/out envelope', category: 'clean-tone', mediaTypes: ['audio'], fn: gentleFade },
];
