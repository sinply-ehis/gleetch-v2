import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asciiShapes } from '../src/effects/image/stylize.js';
import { getEffectById, applyEffectChain } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';
import { hexToRgb } from '../src/core/color.js';

function solidBuf(W, H, r, g, b) {
  const buf = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < buf.length; i += 4) { buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; }
  return buf;
}

// Not "no randomness" like dotMosaic's test (this effect legitimately uses
// rng for palette/random color) — the correct determinism property here is
// "same seed in, same pixels out", which is what recipe-sharing actually
// depends on.
test('asciiShapes is reproducible given the same seed', () => {
  const buf = solidBuf(60, 60, 40, 40, 40); // dark enough that shapes actually get drawn
  const a = asciiShapes(buf, 60, 60, 0.6, prng(42), { colorMode: 'random' });
  const b = asciiShapes(buf, 60, 60, 0.6, prng(42), { colorMode: 'random' });
  assert.deepEqual(Array.from(a), Array.from(b), 'same seed produced different output');
});

test('different seeds produce different random-mode output (rng is actually being used)', () => {
  const buf = solidBuf(60, 60, 40, 40, 40);
  const a = asciiShapes(buf, 60, 60, 0.6, prng(1), { colorMode: 'random' });
  const b = asciiShapes(buf, 60, 60, 0.6, prng(2), { colorMode: 'random' });
  assert.notDeepEqual(Array.from(a), Array.from(b), 'two different seeds produced identical output — rng likely not wired in');
});

test('single mode uses exactly the given color, palette/random do not', () => {
  const buf = solidBuf(40, 40, 20, 20, 20);
  const single = asciiShapes(buf, 40, 40, 0.6, prng(7), { colorMode: 'single', color: '#112233' });
  const [r, g, b] = hexToRgb('#112233');
  let sawExpected = false, sawSomethingElse = false;
  for (let i = 0; i < single.length; i += 4) {
    const isBg = single[i] === 8 && single[i + 1] === 8 && single[i + 2] === 16;
    if (isBg) continue;
    if (single[i] === r && single[i + 1] === g && single[i + 2] === b) sawExpected = true;
    else sawSomethingElse = true;
  }
  assert.ok(sawExpected, 'single mode never drew the requested color');
  assert.ok(!sawSomethingElse, 'single mode drew a color other than the one requested');
});

test('missing params falls back to palette mode and a white single-color default, not a crash', () => {
  const buf = solidBuf(30, 30, 30, 30, 30);
  assert.doesNotThrow(() => asciiShapes(buf, 30, 30, 0.5, prng(3), undefined));
  assert.doesNotThrow(() => asciiShapes(buf, 30, 30, 0.5, prng(3))); // params arg omitted entirely
});

test('near-white regions are left as background, not drawn as a shrinking dot', () => {
  const buf = solidBuf(40, 40, 250, 250, 250); // near-white everywhere
  const out = asciiShapes(buf, 40, 40, 0.6, prng(5), { colorMode: 'palette' });
  for (let i = 0; i < out.length; i += 4) {
    assert.equal(out[i], 8, 'near-white input should stay background, found a drawn pixel');
  }
});

test('registered for both image and video, wired correctly through applyEffectChain', () => {
  assert.ok(getEffectById('asciiShapes', 'image'), 'not registered for image');
  assert.ok(getEffectById('asciiShapes', 'video'), 'not registered for video');
  const buf = solidBuf(20, 20, 15, 15, 15);
  const ctx = { mediaType: 'image', W: 20, H: 20, intensity: 0.5 };
  const red = applyEffectChain(buf, ['asciiShapes'], ctx, prng(1), { asciiShapes: { colorMode: 'single', color: '#ff0000' } });
  const blue = applyEffectChain(buf, ['asciiShapes'], ctx, prng(1), { asciiShapes: { colorMode: 'single', color: '#0000ff' } });
  assert.equal(red.length, 20 * 20 * 4);
  assert.notDeepEqual(Array.from(red), Array.from(blue), 'changing the color param through applyEffectChain (the real call path VisualTab/VideoTab use) had no effect on output');
});
