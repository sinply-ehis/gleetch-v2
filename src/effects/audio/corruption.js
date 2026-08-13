import { clamp } from '../../core/color.js';

export function bitCrush(ch, sr, intensity) {
  if (intensity <= 0) return ch;
  const bits = Math.max(2, Math.floor(16 - intensity * 13));
  const step = 2 / Math.pow(2, bits);
  return ch.map((s) => Math.floor(s / step) * step);
}

export function stutter(ch, sr, intensity, rng) {
  const out = new Float32Array(ch.length);
  let inPos = 0, outPos = 0;
  while (inPos < ch.length && outPos < out.length) {
    const size = Math.max(1, Math.floor(sr * 0.008 + rng() * sr * 0.04 * intensity));
    const reps = rng() < intensity * 0.5 ? 2 + Math.floor(rng() * 3) : 1;
    for (let r = 0; r < reps && outPos < out.length; r++) {
      for (let j = 0; j < size && outPos + j < out.length; j++) out[outPos + j] = ch[Math.min(inPos + j, ch.length - 1)];
      outPos += size;
    }
    inPos += size;
  }
  return out;
}

export function reverse(ch, sr, intensity, rng) {
  const out = new Float32Array(ch);
  let i = 0;
  while (i < ch.length) {
    const size = Math.floor(ch.length * 0.02 + rng() * ch.length * 0.15 * intensity) | 0 || 1;
    if (rng() < intensity * 0.4) {
      const segment = out.slice(i, Math.min(i + size, ch.length));
      segment.reverse();
      out.set(segment, i);
    }
    i += size;
  }
  return out;
}

export function dropout(ch, sr, intensity, rng) {
  const out = new Float32Array(ch);
  let i = 0;
  while (i < ch.length) {
    const size = Math.floor(rng() * ch.length * 0.05) | 0 || 1;
    if (rng() < intensity * 0.3) out.fill(0, i, Math.min(i + size, ch.length));
    i += size;
  }
  return out;
}

export function overdrive(ch, sr, intensity) {
  if (intensity <= 0) return ch;
  const gain = 1 + intensity * 8;
  return ch.map((s) => Math.tanh(s * gain));
}

export function chunkRepeat(ch, sr, intensity, rng) {
  const out = new Float32Array(ch);
  const srcStart = Math.floor(rng() * (ch.length * 0.5)) | 0;
  const srcLen = Math.floor(ch.length * 0.05 + rng() * ch.length * 0.2 * intensity) | 0;
  const reps = Math.floor(intensity * 10);
  for (let r = 0; r < reps; r++) {
    const dst = Math.floor(rng() * ch.length) | 0;
    for (let j = 0; j < srcLen && dst + j < out.length; j++) out[dst + j] = ch[srcStart + j];
  }
  return out;
}

export function tapeWobble(ch, sr, intensity) {
  const out = new Float32Array(ch.length);
  const freq = 0.5 + intensity * 3;
  for (let i = 0; i < ch.length; i++) {
    const wobble = Math.sin((i / sr) * freq * Math.PI * 2) * intensity * 0.03;
    const srcIdx = clamp(i + (Math.floor(wobble * sr) | 0), 0, ch.length - 1);
    out[i] = ch[srcIdx];
  }
  return out;
}

export function sampleCrush(ch, sr, intensity) {
  const factor = Math.max(1, Math.floor(1 + intensity * 15));
  const out = new Float32Array(ch.length);
  for (let i = 0; i < ch.length; i++) out[i] = ch[Math.floor(i / factor) * factor] || 0;
  return out;
}

export function noiseInject(ch, sr, intensity, rng) {
  return ch.map((s) => s + (rng() * 2 - 1) * intensity * 0.3);
}

export function feedback(ch, sr, intensity) {
  const delay = Math.floor(ch.length * 0.05);
  const out = new Float32Array(ch);
  for (let i = delay; i < out.length; i++) out[i] = clamp(out[i] + out[i - delay] * intensity * 0.6, -1, 1);
  return out;
}

// Discrete, decaying repeats at a fixed spacing — a canyon-echo character,
// distinct from FEEDBACK's continuous resonant wash (which recursively
// feeds the delayed signal back into itself, building a dense comb-filter
// texture rather than a few clear, separated repeats).
export function echo(ch, sr, intensity, rng) {
  if (intensity <= 0) return new Float32Array(ch);
  const out = new Float32Array(ch);
  const delaySamples = Math.round(sr * (0.12 + intensity * 0.28));
  const taps = Math.floor(intensity * 7);
  const decay = 0.55 + rng() * 0.15;
  for (let t = 1; t <= taps; t++) {
    const offset = delaySamples * t;
    const amp = Math.pow(decay, t);
    for (let i = offset; i < ch.length; i++) out[i] = clamp(out[i] + ch[i - offset] * amp, -1, 1);
  }
  return out;
}

// Sparse, randomly-timed noise bursts with an attack-decay envelope — the
// achievable version of "something occasionally interrupts." Synthesizing
// an actual scream or vocal "umm" from nothing is a fundamentally different
// (and much harder) problem than filter/delay math — this captures the
// startling-interruption spirit as filtered noise, not a fake voice.
export function outburst(ch, sr, intensity, rng) {
  if (intensity <= 0) return new Float32Array(ch);
  const out = new Float32Array(ch);
  const burstCount = Math.floor(intensity * 6);
  for (let b = 0; b < burstCount; b++) {
    const center = Math.floor(rng() * ch.length);
    const burstLen = Math.floor(sr * (0.05 + rng() * 0.15));
    const attackLen = burstLen * 0.1;
    for (let i = 0; i < burstLen && center + i < ch.length; i++) {
      const envelope = i < attackLen ? i / attackLen : 1 - (i - attackLen) / (burstLen - attackLen);
      out[center + i] = clamp(out[center + i] + (rng() * 2 - 1) * envelope * (0.5 + intensity * 0.5), -1, 1);
    }
  }
  return out;
}

// Granular scatter: chops the whole buffer into small grains and reorders
// them — a genuinely different technique from STUTTER (repeats chunks IN
// PLACE) and DATAMOSH (pastes one source chunk to multiple destinations).
// This shuffles the entire timeline at grain resolution — the "granular
// cloud" texture — with each grain independently eligible to play backward.
// First param-aware audio effect: grainSizeMs/scatterAmount/reverseProbability
// are genuinely per-effect creative dials, while intensity controls how MANY
// grains get reordered at all, same division of labor the image effects use.
export function granularScatter(ch, sr, intensity, rng, params) {
  const grainMs = params?.grainSizeMs ?? 40;
  const scatter = params?.scatterAmount ?? 0.5;
  const reverseProb = params?.reverseProbability ?? 0.2;
  const grainLen = Math.max(1, Math.round((sr * grainMs) / 1000));
  const grainCount = Math.ceil(ch.length / grainLen);

  // Order starts untouched, then bounded-distance swaps shuffle it — distance
  // capped by scatterAmount (0 = no movement, 1 = swaps can span the buffer),
  // frequency capped by intensity (how many grains get touched at all).
  const order = Array.from({ length: grainCount }, (_, i) => i);
  const maxSwapDist = Math.max(1, Math.round(grainCount * scatter));
  for (let i = grainCount - 1; i > 0; i--) {
    if (rng() > intensity) continue;
    const dist = 1 + Math.floor(rng() * Math.min(maxSwapDist, i));
    const j = Math.max(0, i - dist);
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out = new Float32Array(ch.length);
  for (let g = 0; g < grainCount; g++) {
    const srcStart = order[g] * grainLen;
    const dstStart = g * grainLen;
    const len = Math.min(grainLen, ch.length - srcStart, out.length - dstStart);
    if (len <= 0) continue;
    const reverse = rng() < reverseProb * intensity;
    for (let k = 0; k < len; k++) out[dstStart + k] = reverse ? ch[srcStart + len - 1 - k] : ch[srcStart + k];
  }
  return out;
}

export const AUDIO_EFFECTS = [
  { id: 'bitCrush', label: 'BIT CRUSH', hint: 'reduce bit depth', category: 'corruption', mediaTypes: ['audio'], fn: bitCrush },
  { id: 'stutter', label: 'STUTTER', hint: 'repeat sample chunks', category: 'corruption', mediaTypes: ['audio'], fn: stutter },
  { id: 'chunkRepeat', label: 'DATAMOSH', hint: 'paste chunks across buffer', category: 'corruption', mediaTypes: ['audio'], fn: chunkRepeat },
  { id: 'reverse', label: 'REVERSE', hint: 'flip random segments', category: 'corruption', mediaTypes: ['audio'], fn: reverse },
  { id: 'dropout', label: 'DROPOUT', hint: 'random silence bursts', category: 'corruption', mediaTypes: ['audio'], fn: dropout },
  { id: 'sampleCrush', label: 'SAMPLE CRUSH', hint: 'reduce sample rate', category: 'corruption', mediaTypes: ['audio'], fn: sampleCrush },
  { id: 'tapeWobble', label: 'TAPE WOBBLE', hint: 'sinusoidal speed drift', category: 'corruption', mediaTypes: ['audio'], fn: tapeWobble },
  { id: 'noiseInject', label: 'NOISE INJECT', hint: 'inject static', category: 'corruption', mediaTypes: ['audio'], fn: noiseInject },
  { id: 'overdrive', label: 'OVERDRIVE', hint: 'clip and saturate', category: 'corruption', mediaTypes: ['audio'], fn: overdrive },
  { id: 'feedback', label: 'FEEDBACK', hint: 'delayed self-mix', category: 'corruption', mediaTypes: ['audio'], fn: feedback },
  { id: 'echo', label: 'ECHO', hint: 'discrete decaying repeats', category: 'corruption', mediaTypes: ['audio'], fn: echo },
  { id: 'outburst', label: 'OUTBURST', hint: 'sparse jarring noise bursts', category: 'corruption', mediaTypes: ['audio'], fn: outburst },
  {
    id: 'granularScatter', label: 'GRANULAR SCATTER', hint: 'chop into grains and shuffle them', category: 'corruption', mediaTypes: ['audio'], fn: granularScatter,
    params: [
      { key: 'grainSizeMs', type: 'range', label: 'GRAIN SIZE', default: 40, min: 5, max: 150, step: 5 },
      { key: 'scatterAmount', type: 'range', label: 'SCATTER', default: 0.5, min: 0, max: 1, step: 0.05 },
      { key: 'reverseProbability', type: 'range', label: 'REVERSE CHANCE', default: 0.2, min: 0, max: 1, step: 0.05 },
    ],
  },
];
