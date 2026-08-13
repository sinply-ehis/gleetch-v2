import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectById } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

// Purpose: engine-level tests for the pareidolia displacement family and
// matrixColor. The generic smoke test in registry.test.mjs already runs
// every image effect once with default params — this file goes deeper on
// the properties that matter for these specific engines.

const FACE_IDS = ['modularMask', 'anomalousSpasm', 'screamVortex'];
const EFFECT_IDS = [...FACE_IDS, 'matrixColor'];

// A horizontal gradient — uniform solid colors are degenerate for
// displacement effects (moving identical pixels is invisible).
function makeBuf(W, H) {
  const b = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      b[i] = (x * 255) / W | 0;
      b[i + 1] = (y * 255) / H | 0;
      b[i + 2] = 128;
      b[i + 3] = 255;
    }
  }
  return b;
}

function effectParams(e, overrides = {}) {
  const p = {};
  for (const def of e.params) p[def.key] = def.default;
  return Object.assign(p, overrides);
}

test('pareidolia faces + matrixColor produce valid pixel data across many seeds', () => {
  const W = 24, H = 24;
  for (const id of EFFECT_IDS) {
    const e = getEffectById(id, 'image');
    for (let seed = 0; seed < 12; seed++) {
      const out = e.fn(makeBuf(W, H), W, H, 0.8, prng(seed), effectParams(e));
      assert.equal(out.length, W * H * 4, `${id} seed ${seed}: wrong length`);
      for (let i = 0; i < out.length; i++) {
        assert.ok(!Number.isNaN(out[i]), `${id} seed ${seed}: NaN at ${i}`);
        assert.ok(out[i] >= 0 && out[i] <= 255, `${id} seed ${seed}: value ${out[i]} out of range at ${i}`);
      }
    }
  }
});

test('pareidolia faces are identity when displacement + color are disabled, at any intensity', () => {
  const W = 20, H = 20;
  const input = makeBuf(W, H);
  const neutral = { algo: 'sin_r', power: 1.8, chaos: 0, dispersion: 0, colorMode: 'none', levels: 64 };
  for (const id of FACE_IDS) {
    const e = getEffectById(id, 'image');
    for (const intensity of [0, 0.5, 1]) {
      const out = e.fn(input, W, H, intensity, prng(9), neutral);
      assert.deepEqual(Array.from(out), Array.from(input), `${id} intensity ${intensity}: expected identity output`);
    }
  }
});

test('pareidolia faces actually distort at default params (not a no-op)', () => {
  const W = 32, H = 32;
  const input = makeBuf(W, H);
  for (const id of FACE_IDS) {
    const e = getEffectById(id, 'image');
    const out = e.fn(input, W, H, 1, prng(3), effectParams(e));
    assert.notDeepEqual(Array.from(out), Array.from(input), `${id}: default params changed nothing`);
  }
});

test('pareidolia faces and matrixColor are deterministic per seed', () => {
  const W = 20, H = 20;
  for (const id of EFFECT_IDS) {
    const e = getEffectById(id, 'image');
    const a = e.fn(makeBuf(W, H), W, H, 0.6, prng(42), effectParams(e));
    const b = e.fn(makeBuf(W, H), W, H, 0.6, prng(42), effectParams(e));
    assert.deepEqual(Array.from(a), Array.from(b), `${id}: same seed produced different output`);
  }
});

test('every face effect exposes the full 6-param schema and is capture-only + stable', () => {
  for (const id of FACE_IDS) {
    const e = getEffectById(id, 'image');
    assert.deepEqual(e.mediaTypes, ['image', 'video'], `${id}: must be selectable for full-quality capture`);
    assert.equal(e.realtimeSafe, false, `${id}: must be skipped in live video (per-pixel atan2/pow too slow)`);
    assert.equal(e.stableAcrossFrames, true, `${id}: must hold its rng picks for a whole clip`);
    assert.deepEqual(
      e.params.map((p) => p.key),
      ['algo', 'power', 'chaos', 'dispersion', 'colorMode', 'levels'],
      `${id}: param schema drift`
    );
  }
});

test('face effects hold steady within a clip but vary across clips (stableAcrossFrames semantics)', () => {
  // Mirrors the pipeline rule: stable effects are seeded with prng(clipSeed)
  // for every frame, so the effect must draw the same per-clip style no
  // matter the frame seed, and a different style for a different clip.
  const W = 64, H = 64;
  for (const id of FACE_IDS) {
    const e = getEffectById(id, 'image');
    const clipSeed = 555;
    const frame1 = e.fn(makeBuf(W, H), W, H, 0.6, prng(clipSeed), effectParams(e));
    const frame2 = e.fn(makeBuf(W, H), W, H, 0.6, prng(clipSeed), effectParams(e));
    assert.deepEqual(Array.from(frame1), Array.from(frame2), `${id}: flickered within the same clip`);

    const clipA = e.fn(makeBuf(W, H), W, H, 0.6, prng(111), effectParams(e));
    const clipB = e.fn(makeBuf(W, H), W, H, 0.6, prng(999), effectParams(e));
    assert.notDeepEqual(Array.from(clipA), Array.from(clipB), `${id}: did not vary across different clips/reroll`);
  }
});

test('matrixColor params: levels posterize applies at full intensity, ramps with it', () => {
  const W = 16, H = 16;
  const e = getEffectById('matrixColor', 'image');
  const full = e.fn(makeBuf(W, H), W, H, 1, prng(1), effectParams(e, { colorMode: 'none', levels: 2 }));
  for (let i = 0; i < full.length; i += 4) {
    for (const c of [0, 1, 2]) assert.ok([0, 128, 255].includes(full[i + c]), `value ${full[i + c]} not quantized to 2 levels`);
  }
  const low = e.fn(makeBuf(W, H), W, H, 0.25, prng(1), effectParams(e, { colorMode: 'none', levels: 2 }));
  assert.notDeepEqual(Array.from(low), Array.from(full), 'quarter intensity must posterize less than full intensity');
});
