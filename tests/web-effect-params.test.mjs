import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectById, getEffectsFor, buildWebCSS } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

const NEW_WEB_IDS = ['overlayScreenWeb', 'overlayMultiplyWeb', 'overlayBlendWeb', 'cssParticleDrift', 'neonGlow', 'filmGrain'];

test('all 6 new web effects are registered with params and a valid category', () => {
  for (const id of NEW_WEB_IDS) {
    const e = getEffectById(id, 'web');
    assert.ok(e, `${id} not registered for web`);
    assert.ok(Array.isArray(e.params) && e.params.length > 0, `${id} has no params schema`);
    assert.ok(e.category, `${id} has no category`);
  }
  assert.equal(getEffectsFor('web').length, 14, 'expected 8 original + 6 new web effects');
});

test('the three overlay variants use distinct mix-blend-mode values, not copy-paste duplicates', () => {
  const screen = buildWebCSS(['overlayScreenWeb'], 0.5, prng(1));
  const multiply = buildWebCSS(['overlayMultiplyWeb'], 0.5, prng(1));
  const blend = buildWebCSS(['overlayBlendWeb'], 0.5, prng(1));
  assert.ok(screen.includes('mix-blend-mode:screen'));
  assert.ok(multiply.includes('mix-blend-mode:multiply'));
  assert.ok(blend.includes('mix-blend-mode:overlay'));
  assert.notEqual(screen, multiply);
  assert.notEqual(multiply, blend);
});

test('buildWebCSS actually applies custom effectParams, not just schema defaults (regression: this was the Part 1 wiring gap)', () => {
  const defaultCss = buildWebCSS(['overlayScreenWeb'], 0.5, prng(1));
  const customCss = buildWebCSS(['overlayScreenWeb'], 0.5, prng(1), { overlayScreenWeb: { overlayOpacity: 0.85, overlayColor: '#ABCDEF' } });
  assert.ok(customCss.includes('#ABCDEF'), 'custom overlayColor did not reach the generated CSS');
  assert.ok(customCss.includes('opacity:0.85'), 'custom overlayOpacity did not reach the generated CSS');
  assert.notEqual(defaultCss, customCss);
});

test('neonGlow: glowSpread param changes the drop-shadow blur radii in the output', () => {
  const tight = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowSpread: 1 } });
  const wide = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowSpread: 10 } });
  assert.notEqual(tight, wide, 'changing glowSpread had no effect on output');
});

test('cssParticleDrift: particleCount actually changes the number of gradient layers generated', () => {
  const css20 = buildWebCSS(['cssParticleDrift'], 0.5, prng(1), { cssParticleDrift: { particleCount: '20' } });
  const css60 = buildWebCSS(['cssParticleDrift'], 0.5, prng(1), { cssParticleDrift: { particleCount: '60' } });
  const count = (css) => (css.match(/radial-gradient/g) || []).length;
  assert.equal(count(css20), 20);
  assert.equal(count(css60), 60);
});

test('cssParticleDrift: particle positions vary with seed and land within the 0-100% box', () => {
  const a = buildWebCSS(['cssParticleDrift'], 0.5, prng(1), { cssParticleDrift: { particleCount: '20' } });
  const b = buildWebCSS(['cssParticleDrift'], 0.5, prng(2), { cssParticleDrift: { particleCount: '20' } });
  assert.notEqual(a, b, 'two different seeds produced identical particle layout');
  const positions = [...a.matchAll(/at ([\d.]+)% ([\d.]+)%/g)];
  assert.equal(positions.length, 20);
  for (const [, x, y] of positions) {
    assert.ok(Number(x) >= 0 && Number(x) <= 100, `x=${x} out of range`);
    assert.ok(Number(y) >= 0 && Number(y) <= 100, `y=${y} out of range`);
  }
});

test('filmGrain is structurally distinct from cssNoiseStatic, not a reskin', () => {
  const grain = buildWebCSS(['filmGrain'], 0.5, prng(1));
  const noise = buildWebCSS(['cssNoiseStatic'], 0.5, prng(1));
  assert.ok(grain.includes("type='turbulence'"), 'filmGrain should use turbulence noise, not fractalNoise');
  assert.ok(noise.includes("type='fractalNoise'"), 'cssNoiseStatic should still use fractalNoise (unchanged)');
  assert.ok(grain.includes('feColorMatrix'), 'filmGrain should desaturate its noise');
  assert.notEqual(grain, noise);
});

test('all 6 new effects run cleanly with missing/undefined params (no crash, no undefined/NaN leaking into CSS)', () => {
  for (const id of NEW_WEB_IDS) {
    const css = buildWebCSS([id], 0.6, prng(9));
    assert.ok(!css.includes('undefined'), `${id}: output contains literal "undefined"`);
    assert.ok(!css.includes('NaN'), `${id}: output contains NaN`);
    assert.ok(css.length > 0, `${id}: produced empty output`);
  }
});

test('all 6 new effects can run together in one chain without throwing or colliding on animation names', () => {
  const css = buildWebCSS(NEW_WEB_IDS, 0.7, prng(3));
  assert.ok(!css.includes('undefined') && !css.includes('NaN'));
  // Each effect's @keyframes name must be unique or animations silently overwrite each other.
  const names = [...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
  assert.equal(new Set(names).size, names.length, 'duplicate @keyframes name across new effects');
});
