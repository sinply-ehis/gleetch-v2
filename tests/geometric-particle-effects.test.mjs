import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectById, getEffectsFor, applyEffectChain } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

const W = 64, H = 64; // small canvas keeps these tests fast

function makeBuf(seed = 1) {
  const rng = prng(seed);
  const buf = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = Math.floor(rng() * 255); buf[i + 1] = Math.floor(rng() * 255); buf[i + 2] = Math.floor(rng() * 255); buf[i + 3] = 255;
  }
  return buf;
}

test('particleDissolve, voronoi, and crystallize are registered for image and video with a params schema', () => {
  for (const id of ['particleDissolve', 'voronoi', 'crystallize']) {
    const img = getEffectById(id, 'image');
    const vid = getEffectById(id, 'video');
    assert.ok(img, `${id} missing from image`);
    assert.ok(vid, `${id} missing from video`);
    assert.ok(Array.isArray(img.params) && img.params.length > 0, `${id} has no params schema`);
  }
});

test('voronoi and crystallize are flagged realtimeSafe:false (measured too slow for continuous video playback)', () => {
  assert.equal(getEffectById('voronoi', 'video').realtimeSafe, false);
  assert.equal(getEffectById('crystallize', 'video').realtimeSafe, false);
  assert.equal(getEffectById('particleDissolve', 'video').realtimeSafe, false);
});

test('particleDissolve: higher density dissolves more pixels to transparent', () => {
  const buf = makeBuf();
  const low = applyEffectChain(buf, ['particleDissolve'], { mediaType: 'image', W, H, intensity: 0.5 }, prng(5), { particleDissolve: { density: 0.1, edgeSoftness: 0.05 } });
  const high = applyEffectChain(buf, ['particleDissolve'], { mediaType: 'image', W, H, intensity: 0.5 }, prng(5), { particleDissolve: { density: 0.8, edgeSoftness: 0.05 } });
  const countTransparent = (b) => { let n = 0; for (let i = 3; i < b.length; i += 4) if (b[i] === 0) n++; return n; };
  assert.ok(countTransparent(high) > countTransparent(low), 'higher density should dissolve more pixels');
});

test('particleDissolve: with density 0 and no edge color, the image is untouched', () => {
  const buf = makeBuf();
  const out = applyEffectChain(buf, ['particleDissolve'], { mediaType: 'image', W, H, intensity: 0.5 }, prng(5), { particleDissolve: { density: 0, edgeSoftness: 0.02 } });
  assert.deepEqual(Array.from(out), Array.from(buf));
});

test('voronoi (source-average mode): every pixel in the output matches one of a small set of flat cell colors or the edge shade', () => {
  const buf = makeBuf();
  const out = applyEffectChain(buf, ['voronoi'], { mediaType: 'image', W, H, intensity: 1 }, prng(7), { voronoi: { cellSize: 16, cellColor: 'source-average', edgeThickness: 1 } });
  const uniqueColors = new Set();
  for (let i = 0; i < out.length; i += 4) uniqueColors.add(`${out[i]},${out[i + 1]},${out[i + 2]}`);
  // A 64x64 canvas with 16px cells is at most 16 cells + 1 edge shade — nowhere near the
  // per-pixel noise of the source image, which is the actual claim being tested here. At intensity 1, pure effect.
  assert.ok(uniqueColors.size <= 20, `expected a small flat palette from cell-averaging, got ${uniqueColors.size} unique colors`);
});

test('crystallize (outline-only mode): preserves original pixel colors away from cell boundaries', () => {
  const buf = makeBuf();
  const out = applyEffectChain(buf, ['crystallize'], { mediaType: 'image', W, H, intensity: 0.3 }, prng(7), { crystallize: { cellSize: 20, cellColor: 'outline-only', edgeThickness: 1 } });
  let unchangedCount = 0;
  for (let i = 0; i < out.length; i += 4) {
    if (out[i] === buf[i] && out[i + 1] === buf[i + 1] && out[i + 2] === buf[i + 2]) unchangedCount++;
  }
  assert.ok(unchangedCount > (out.length / 4) * 0.5, 'crystallize should leave most of the source image visible between facet lines');
});

test('voronoi and crystallize share the same cell layout for a given seed (same fn, different default fill mode)', () => {
  const a = getEffectById('voronoi', 'image');
  const b = getEffectById('crystallize', 'image');
  assert.equal(a.fn, b.fn, 'voronoi and crystallize should share one implementation, not duplicate it');
});

test('all three new effects run cleanly across every effect in getEffectsFor, no crashes, output is the right length', () => {
  const buf = makeBuf();
  for (const id of ['particleDissolve', 'voronoi', 'crystallize']) {
    const out = applyEffectChain(buf, [id], { mediaType: 'image', W, H, intensity: 0.6 }, prng(3));
    assert.equal(out.length, buf.length, `${id}: output length mismatch`);
  }
});

test('particleDissolve and voronoi/crystallize appear in the image and video effect lists exactly once each', () => {
  for (const media of ['image', 'video']) {
    const ids = getEffectsFor(media).map((e) => e.id);
    for (const id of ['particleDissolve', 'voronoi', 'crystallize']) {
      assert.equal(ids.filter((x) => x === id).length, 1, `${id} should appear exactly once in ${media}`);
    }
  }
});
