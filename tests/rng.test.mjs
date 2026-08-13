import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prng, seedFromString } from '../src/core/rng.js';

// This is a regression test for a real bug: prng() originally divided by
// 2^31 instead of 2^32, so 50% of every draw across the entire app landed
// in [1, 2) instead of [0, 1). See README's "Pre-deploy audit" section for
// the full story. If this test ever fails, that bug is back.
test('prng() never returns a value >= 1.0', () => {
  const rng = prng(42);
  let max = 0;
  for (let i = 0; i < 200_000; i++) {
    const v = rng();
    if (v > max) max = v;
    assert.ok(v < 1, `prng() returned ${v} at draw ${i}, expected < 1`);
    assert.ok(v >= 0, `prng() returned ${v} at draw ${i}, expected >= 0`);
  }
  assert.ok(max > 0.99, 'sanity: prng() should get close to 1 across 200k draws, got max=' + max);
});

test('prng() is deterministic for a given seed', () => {
  const a = prng(123), b = prng(123);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('prng() produces different streams for different seeds', () => {
  const a = prng(1), b = prng(2);
  let sawDifference = false;
  for (let i = 0; i < 20; i++) if (a() !== b()) { sawDifference = true; break; }
  assert.ok(sawDifference, 'seed 1 and seed 2 produced identical streams');
});

test('seedFromString is deterministic and non-zero', () => {
  assert.equal(seedFromString('FONT SHUFFLE'), seedFromString('FONT SHUFFLE'));
  assert.notEqual(seedFromString('FONT SHUFFLE'), 0);
  assert.notEqual(seedFromString('a'), seedFromString('b'));
});
