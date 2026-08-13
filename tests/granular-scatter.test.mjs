import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectById, getEffectsFor, applyEffectChain } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

const SR = 44100;

function makeChannel(seconds = 0.5, seed = 1) {
  const rng = prng(seed);
  const ch = new Float32Array(Math.round(SR * seconds));
  for (let i = 0; i < ch.length; i++) ch[i] = rng() * 2 - 1;
  return ch;
}

test('granularScatter is registered for audio with a params schema', () => {
  const e = getEffectById('granularScatter', 'audio');
  assert.ok(e);
  assert.equal(e.category, 'corruption');
  assert.ok(Array.isArray(e.params) && e.params.length === 3);
});

test('granularScatter preserves buffer length and stays within [-1, 1]', () => {
  const ch = makeChannel();
  const out = applyEffectChain(ch, ['granularScatter'], { mediaType: 'audio', sampleRate: SR, intensity: 0.7 }, prng(2));
  assert.equal(out.length, ch.length);
  for (const s of out) assert.ok(s >= -1.0001 && s <= 1.0001, `sample out of range: ${s}`);
});

test('granularScatter at intensity 0 leaves every grain in its original position (no reordering)', () => {
  const ch = makeChannel(0.2);
  const out = applyEffectChain(ch, ['granularScatter'], { mediaType: 'audio', sampleRate: SR, intensity: 0 }, prng(4), { granularScatter: { grainSizeMs: 40, scatterAmount: 0.5, reverseProbability: 0 } });
  assert.deepEqual(Array.from(out), Array.from(ch));
});

test('granularScatter at intensity 1 actually reorders grains (output differs from input)', () => {
  const ch = makeChannel(0.3, 9);
  const out = applyEffectChain(ch, ['granularScatter'], { mediaType: 'audio', sampleRate: SR, intensity: 1 }, prng(4), { granularScatter: { grainSizeMs: 30, scatterAmount: 1, reverseProbability: 0 } });
  assert.notDeepEqual(Array.from(out), Array.from(ch));
});

test('granularScatter: smaller grainSizeMs produces more, smaller grains (finer-grained shuffle)', () => {
  const ch = makeChannel(0.3, 3);
  const fine = applyEffectChain(ch, ['granularScatter'], { mediaType: 'audio', sampleRate: SR, intensity: 1 }, prng(1), { granularScatter: { grainSizeMs: 10, scatterAmount: 1, reverseProbability: 0 } });
  const coarse = applyEffectChain(ch, ['granularScatter'], { mediaType: 'audio', sampleRate: SR, intensity: 1 }, prng(1), { granularScatter: { grainSizeMs: 100, scatterAmount: 1, reverseProbability: 0 } });
  assert.notDeepEqual(Array.from(fine), Array.from(coarse));
});

test('granularScatter appears exactly once in the audio effect list', () => {
  const ids = getEffectsFor('audio').map((e) => e.id);
  assert.equal(ids.filter((x) => x === 'granularScatter').length, 1);
});
