import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDocumentShim } from './helpers/mock-canvas.mjs';

installDocumentShim();
const { overlayScreen, overlayMultiply, overlayBlend } = await import('../src/effects/image/overlay.js');
const { prng } = await import('../src/core/rng.js');

function makeBuf(W, H) {
  const b = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < b.length; i += 4) { b[i] = 90; b[i + 1] = 140; b[i + 2] = 200; b[i + 3] = 255; }
  return b;
}

test('overlay effects (screen, multiply, blend) run without throwing across many seeds', () => {
  const W = 24, H = 24;
  for (const [name, fn] of [['overlayScreen', overlayScreen], ['overlayMultiply', overlayMultiply], ['overlayBlend', overlayBlend]]) {
    for (let seed = 0; seed < 15; seed++) {
      const out = fn(makeBuf(W, H), W, H, 0.7, prng(seed));
      assert.equal(out.length, W * H * 4, `${name} seed ${seed}: wrong length`);
      for (let i = 0; i < out.length; i++) {
        assert.ok(!Number.isNaN(out[i]), `${name} seed ${seed}: NaN`);
        assert.ok(out[i] >= 0 && out[i] <= 255, `${name} seed ${seed}: out of range value ${out[i]}`);
      }
    }
  }
});
