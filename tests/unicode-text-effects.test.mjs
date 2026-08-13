import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fontShuffle } from '../src/effects/text/typography.js';
import { positionDistortion } from '../src/effects/text/position.js';
import { prng } from '../src/core/rng.js';

// Regression test for a real bug: Mathematical Alphanumeric Symbols live
// above U+FFFF (a surrogate PAIR, two UTF-16 code units each). The first
// implementation indexed them with raw string[i], which slices a pair in
// half and produces a broken glyph (U+FFFD) or literal "undefined" when
// the resulting index goes out of bounds. Fixed by pre-splitting each
// style into a codepoint array with Array.from() before any lookup.
test('fontShuffle never produces broken glyphs or literal "undefined"', () => {
  const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let seed = 0; seed < 100; seed++) {
    const out = fontShuffle(allChars, 1.0, prng(seed));
    assert.ok(!out.includes('\uFFFD'), `seed ${seed}: broken glyph (U+FFFD) in output`);
    assert.ok(!out.includes('undefined'), `seed ${seed}: literal "undefined" in output`);
    assert.equal(Array.from(out).length, Array.from(allChars).length, `seed ${seed}: codepoint count mismatch`);
  }
});

test('fontShuffle is deterministic for a given seed', () => {
  const a = fontShuffle('GLEETCH', 0.9, prng(26));
  const b = fontShuffle('GLEETCH', 0.9, prng(26));
  assert.equal(a, b);
});

test('positionDistortion never produces broken glyphs or literal "undefined"', () => {
  const sample = 'The quick brown fox jumps over the lazy dog 123 times today.';
  for (let seed = 0; seed < 100; seed++) {
    const out = positionDistortion(sample, 0.9, prng(seed));
    assert.ok(!out.includes('\uFFFD'), `seed ${seed}: broken glyph in output`);
    assert.ok(!out.includes('undefined'), `seed ${seed}: literal "undefined" in output`);
  }
});
