import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dotMosaic } from '../src/effects/image/stylize.js';
import { getEffectById, applyEffectChain } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

function solidBuf(W, H, r, g, b) {
  const buf = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < buf.length; i += 4) { buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; }
  return buf;
}

// This is the actual regression: the effect exists specifically to be a
// grid-ALIGNED alternative to the earlier random-stipple approach. If any
// future edit slips in Math.random()/rng-based jitter, this test catches it.
test('dotMosaic is fully deterministic — no hidden randomness across calls', () => {
  const buf = solidBuf(40, 40, 180, 90, 40);
  const a = dotMosaic(buf, 40, 40, 0.6);
  const b = dotMosaic(buf, 40, 40, 0.6);
  assert.deepEqual(Array.from(a), Array.from(b), 'two calls with identical input produced different output');
});

// Regression test for a real bug found while building this: edge cells were
// centering dots using the NOMINAL cell size instead of the actual (clipped)
// cell width/height, pushing right/bottom-edge dot centers past the canvas.
// W=23/H=17 are deliberately not exact multiples of any cell size this
// effect produces (4-20), so this exercises several clipped edge cells, not
// just a single sub-cell image like edge-cases.test.mjs already covers.
test('dotMosaic handles dimensions that are not an exact multiple of the cell size', () => {
  for (const intensity of [0, 0.3, 0.6, 1]) {
    const buf = solidBuf(23, 17, 100, 150, 200);
    const out = dotMosaic(buf, 23, 17, intensity);
    assert.equal(out.length, 23 * 17 * 4, `intensity=${intensity}: wrong output length`);
    for (let i = 0; i < out.length; i++) assert.ok(!Number.isNaN(out[i]), `intensity=${intensity}: NaN at ${i}`);
  }
});

test('dotMosaic preserves the source color on a solid-color image', () => {
  const out = dotMosaic(solidBuf(40, 40, 200, 60, 30), 40, 40, 0.6);
  // every drawn (non-background) pixel should be the same solid color back —
  // averaging a uniform cell can't produce anything else
  for (let i = 0; i < out.length; i += 4) {
    const isBackground = out[i] === 255 && out[i + 1] === 255 && out[i + 2] === 255;
    if (!isBackground) {
      assert.equal(out[i], 200, `pixel ${i / 4}: r channel drifted from source`);
      assert.equal(out[i + 1], 60, `pixel ${i / 4}: g channel drifted from source`);
      assert.equal(out[i + 2], 30, `pixel ${i / 4}: b channel drifted from source`);
    }
  }
});

// Confirms the registry entry itself is wired correctly for both media types
// dotMosaic was added for, not just that the bare function works.
test('dotMosaic is registered for both image and video', () => {
  assert.ok(getEffectById('dotMosaic', 'image'), 'not registered for image');
  assert.ok(getEffectById('dotMosaic', 'video'), 'not registered for video');
  const out = applyEffectChain(solidBuf(20, 20, 10, 20, 30), ['dotMosaic'], { mediaType: 'image', W: 20, H: 20, intensity: 0.5 }, prng(1));
  assert.equal(out.length, 20 * 20 * 4);
});
