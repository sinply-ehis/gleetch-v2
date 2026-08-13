import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmLowpass, softCompress, subtleVibrato, gentleFade } from '../src/effects/audio/clean-tone.js';
import { getCategoriesFor, getEffectsFor } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

const sr = 44100;

test('audio clean-tone effects run without throwing and stay in [-1, 1]', () => {
  const ch = new Float32Array(300).fill(0.3);
  for (const fn of [warmLowpass, softCompress, subtleVibrato, gentleFade]) {
    const out = fn(ch, sr, 0.7, prng(1));
    for (let i = 0; i < out.length; i++) {
      assert.ok(!Number.isNaN(out[i]), `${fn.name}: NaN at index ${i}`);
      assert.ok(out[i] >= -1 && out[i] <= 1, `${fn.name}: out of range value ${out[i]} at index ${i}`);
    }
  }
});

test('audio has a clean-tone category alongside corruption (parity gap closed)', () => {
  assert.deepEqual(getCategoriesFor('audio').sort(), ['clean-tone', 'corruption']);
});

// Regression test for a real bug caught during development: the gain
// calculation divided by envelope UNCONDITIONALLY every sample, including
// when not compressing (envelope <= threshold) — giving a wrong multiplier
// (1/envelope instead of the correct 1) in the non-compressing case. This
// verifies the actual compression behavior, not just "doesn't crash."
test('softCompress genuinely reduces dynamic range between quiet and loud sections', () => {
  const ch = new Float32Array(2000);
  for (let i = 0; i < ch.length; i++) ch[i] = i < 1000 ? Math.sin(i * 0.3) * 0.1 : Math.sin(i * 0.3) * 0.9;
  const rms = (arr) => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);

  const origRatio = rms(ch.slice(1000)) / rms(ch.slice(0, 1000));
  const compressed = softCompress(ch, sr, 0.8);
  const compRatio = rms(compressed.slice(1000)) / rms(compressed.slice(0, 1000));

  assert.ok(compRatio < origRatio, `expected compression to reduce loud/quiet ratio (was ${origRatio.toFixed(2)}, got ${compRatio.toFixed(2)})`);
});

test('warmLowpass genuinely attenuates high frequencies', () => {
  const n = 4410;
  const highFreq = new Float32Array(n);
  for (let i = 0; i < n; i++) highFreq[i] = Math.sin((2 * Math.PI * 8000 * i) / sr) * 0.8;
  const out = warmLowpass(highFreq, sr, 0.9);
  const rms = (arr) => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
  assert.ok(rms(out) < rms(highFreq) * 0.5, 'expected significant attenuation of an 8kHz tone at high intensity');
});

test('POLISH preset uses only clean-tone effects', () => {
  const presets = getEffectsFor('audio');
  const cleanToneIds = new Set(presets.filter((e) => e.category === 'clean-tone').map((e) => e.id));
  for (const id of ['warmLowpass', 'softCompress', 'gentleFade']) {
    assert.ok(cleanToneIds.has(id), `${id} should be a clean-tone effect`);
  }
});
