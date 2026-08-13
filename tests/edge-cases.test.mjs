import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectsFor } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

test('image effects handle intensity boundaries (0 and 1) without NaN', () => {
  for (const e of getEffectsFor('image')) {
    if (e.id.startsWith('overlay')) continue; // needs DOM, covered in overlay.test.mjs
    for (const intensity of [0, 1]) {
      const buf = new Uint8ClampedArray(16 * 16 * 4).fill(120);
      const out = e.needsChannel ? e.fn(buf, 16, 16, intensity, 'brightness', prng(1)) : e.fn(buf, 16, 16, intensity, prng(1));
      for (let i = 0; i < out.length; i++) assert.ok(!Number.isNaN(out[i]), `${e.id} intensity=${intensity}: NaN`);
    }
  }
});

test('image effects handle tiny and odd dimensions (1x1 through 5x1)', () => {
  for (const e of getEffectsFor('image')) {
    if (e.id.startsWith('overlay')) continue;
    for (const [W, H] of [[1, 1], [2, 2], [3, 3], [1, 5], [5, 1]]) {
      const buf = new Uint8ClampedArray(W * H * 4).fill(120);
      const out = e.needsChannel ? e.fn(buf, W, H, 0.6, 'brightness', prng(1)) : e.fn(buf, W, H, 0.6, prng(1));
      assert.equal(out.length, W * H * 4, `${e.id} ${W}x${H}: wrong output length`);
      for (let i = 0; i < out.length; i++) assert.ok(!Number.isNaN(out[i]), `${e.id} ${W}x${H}: NaN`);
    }
  }
});

test('text effects handle empty string, whitespace-only, and single-character input', () => {
  for (const e of getEffectsFor('text')) {
    for (const input of ['', '   ', 'X']) {
      const out = e.fn(input, 0.9, prng(1));
      assert.equal(typeof out, 'string', `${e.id} on ${JSON.stringify(input)}: did not return a string`);
    }
  }
});

test('audio effects handle zero and near-zero-length buffers without NaN', () => {
  for (const e of getEffectsFor('audio')) {
    for (const len of [0, 1, 2, 5]) {
      const out = e.fn(new Float32Array(len).fill(0.3), 44100, 0.6, prng(1));
      for (let i = 0; i < out.length; i++) assert.ok(!Number.isNaN(out[i]), `${e.id} len=${len}: NaN`);
    }
  }
});

test('web effects handle intensity boundaries (0 and 1)', () => {
  for (const e of getEffectsFor('web')) {
    for (const intensity of [0, 1]) {
      const r = e.fn(intensity, prng(1));
      assert.equal(typeof r, 'object', `${e.id} intensity=${intensity}: bad return shape`);
    }
  }
});
