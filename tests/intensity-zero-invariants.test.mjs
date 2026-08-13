import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectsFor } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

// Purpose: enforce the library's master invariant — intensity 0 means
// "effect off" (output identical to input) for EVERY effect, with varied
// (not solid) inputs so position/frequency-based effects genuinely engage.
// Regression file for the polish round that fixed 18 effects which kept
// damaging the signal at intensity 0 (quantize, pixelEcho, halftone/dot
// mosaic/edge sketch/ascii/voronoi/dissolve, bitCrush, overdrive, outburst,
// echo, sampleCrush, warmLowpass, softCompress, gentleFade, caseWave,
// matrixColor).

function gradBuf(W, H) {
  const b = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      b[i] = (x * 255) / W | 0;
      b[i + 1] = (y * 255) / H | 0;
      b[i + 2] = 128 + ((x * 31) % 40);
      b[i + 3] = 255;
    }
  }
  return b;
}

const eq = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

test('every image effect is identity at intensity 0 (on a varied image)', () => {
  const W = 48, H = 48;
  for (const e of getEffectsFor('image')) {
    if (e.id.startsWith('overlay')) continue; // DOM-dependent, covered elsewhere
    const input = gradBuf(W, H);
    const out = e.needsChannel
      ? e.fn(input, W, H, 0, 'brightness', prng(9))
      : e.fn(input, W, H, 0, prng(9));
    assert.ok(eq(out, input), `${e.id}: changed the image at intensity 0`);
  }
});

test('every audio effect is identity at intensity 0 (on a 2s chirp)', () => {
  const SR = 44100;
  const chirp = new Float32Array(SR * 2).map((_, i) => Math.sin(2 * Math.PI * (200 + 400 * i / (SR * 2)) * i / SR) * 0.8);
  for (const e of getEffectsFor('audio')) {
    const out = e.fn(chirp, SR, 0, prng(9));
    assert.ok(eq(out, chirp), `${e.id}: changed the audio at intensity 0`);
  }
});

test('every text effect is identity at intensity 0', () => {
  const s = 'The Quick Brown Fox Jumps Over the Lazy Dog 12345.';
  for (const e of getEffectsFor('text')) {
    const out = e.fn(s, 0, prng(9));
    assert.equal(out, s, `${e.id}: changed the text at intensity 0`);
  }
});

test('intensity 0 identity holds for param-aware effects with non-default params', () => {
  const W = 40, H = 40;
  const paramCases = [
    ['asciiShapes', { asciiShapes: { colorMode: 'single', color: '#FF00AA' } }],
    ['voronoi', { voronoi: { cellSize: 12, cellColor: 'source-average', edgeThickness: 3 } }],
    ['crystallize', { crystallize: { cellSize: 24, cellColor: 'outline-only', edgeThickness: 2 } }],
    ['particleDissolve', { particleDissolve: { density: 0.9, edgeSoftness: 0.02, particleColor: '#FF00AA' } }],
  ];
  for (const [id, effectParams] of paramCases) {
    const e = getEffectsFor('image').find((x) => x.id === id);
    const input = gradBuf(W, H);
    const out = e.needsChannel ? e.fn(input, W, H, 0, 'brightness', prng(9), effectParams[id]) : e.fn(input, W, H, 0, prng(9), effectParams[id]);
    assert.ok(eq(out, input), `${id}: changed the image at intensity 0 with custom params`);
  }
});