import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRecipe, decodeRecipe } from '../src/core/recipe.js';
import { getEffectsFor, applyVideoEffectChain } from '../src/effects/registry.js';

test('recipe encode/decode round-trips exactly', () => {
  const recipe = { t: 'visual', s: 41302, a: ['pixelSort', 'chanShift', 'gaussianBlur'], i: 0.55, c: 'brightness' };
  const decoded = decodeRecipe(encodeRecipe(recipe));
  assert.deepEqual(decoded, recipe);
});

test('recipe encoding produces a URL-safe string (no +, /, or =)', () => {
  const encoded = encodeRecipe({ t: 'text', s: 1, a: ['zalgo'], i: 0.5 });
  assert.ok(!/[+/=]/.test(encoded), `encoded recipe contains URL-unsafe characters: ${encoded}`);
});

test('decodeRecipe fails safe (returns null, never throws) on malformed input', () => {
  for (const bad of ['not-valid-base64-!!!', '', btoa(JSON.stringify({ foo: 'bar' })), 'null', '{}']) {
    assert.equal(decodeRecipe(bad), null, `expected null for input: ${JSON.stringify(bad)}`);
  }
});

// Added alongside the asciiShapes effect and its `p` (per-effect params)
// field. decodeRecipe itself needed zero changes for this — it already
// returns whatever valid object it parses, so an extra field just flows
// through — but worth a dedicated test since "requires no code change"
// is exactly the kind of claim that should be verified, not assumed.
test('recipe with a p (effect params) field round-trips exactly', () => {
  const recipe = { t: 'visual', s: 99, a: ['asciiShapes'], i: 0.6, c: 'brightness', p: { asciiShapes: { colorMode: 'single', color: '#ff00aa' } } };
  const decoded = decodeRecipe(encodeRecipe(recipe));
  assert.deepEqual(decoded, recipe);
});

test('a recipe with no p field still decodes fine — old shared links stay valid', () => {
  const recipe = { t: 'visual', s: 41302, a: ['pixelSort'], i: 0.55, c: 'brightness' };
  const decoded = decodeRecipe(encodeRecipe(recipe));
  assert.equal(decoded.p, undefined, 'old-shaped recipe should not have a p field materialize from nowhere');
  assert.equal(typeof (decoded.p ?? {}), 'object', 'decoded.p ?? {} — the actual fallback pattern used in VisualTab/VideoTab — should be a safe, usable object');
});

// Regression test for the video "full quality frame" feature: oilPaint and
// the overlay effects are tagged realtimeSafe:false so they're selectable
// in the video effect panel but skipped during continuous playback/export
// (too slow for 30fps) — they should only run via the unfiltered
// applyEffectChain path used for the single-frame capture.
test('applyVideoEffectChain skips realtimeSafe:false effects (oilPaint, overlay*)', () => {
  const ctx = { W: 16, H: 16, intensity: 0.6, channel: 'brightness' };
  const buf = new Uint8ClampedArray(16 * 16 * 4).fill(120);
  for (const id of ['oilPaint', 'overlayScreen', 'overlayMultiply', 'overlayBlend']) {
    const out = applyVideoEffectChain(buf.slice(0), [id], ctx, 1, 1);
    assert.deepEqual(Array.from(out), Array.from(buf), `${id}: applyVideoEffectChain should have skipped this (no-op expected)`);
  }
});

test('oilPaint and overlay effects ARE tagged for video mediaType (selectable for full-quality capture)', () => {
  const videoIds = new Set(getEffectsFor('video').map((e) => e.id));
  for (const id of ['oilPaint', 'overlayScreen', 'overlayMultiply', 'overlayBlend']) {
    assert.ok(videoIds.has(id), `${id} should be tagged mediaTypes including 'video'`);
  }
});

test('regular video effects (not realtimeSafe:false) still run normally through applyVideoEffectChain', () => {
  const ctx = { W: 16, H: 16, intensity: 0.6, channel: 'brightness' };
  // A uniform solid color is degenerate for chanShift specifically: it
  // shifts pixel POSITIONS, which is invisible when every position holds
  // an identical value (same lesson as the stableAcrossFrames test fixture
  // elsewhere in this suite — needs spatial variation, not just color).
  const buf = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      buf[i] = (x * 255) / 16 | 0; buf[i + 1] = (y * 255) / 16 | 0; buf[i + 2] = 128; buf[i + 3] = 255;
    }
  }
  const out = applyVideoEffectChain(buf.slice(0), ['chanShift'], ctx, 1, 1);
  assert.notDeepEqual(Array.from(out), Array.from(buf), 'chanShift should have visibly changed the buffer');
});
