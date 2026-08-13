import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWebCSS, applyEffectChain, getEffectById } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

// Recipes are decoded JSON from a URL parameter with no schema enforcement
// of their own. Web effects interpolate color params directly into
// generated CSS strings, so a crafted recipe's color field could otherwise
// break out of its CSS value context and inject arbitrary rules into
// whatever page the resulting CSS ends up applied to (console-snippet /
// bookmarklet). This is the fix: every param gets validated against its
// own schema at the one chokepoint all three chain runners share, not
// trusted as-is from a loaded recipe.

test('a crafted color param cannot break out of its CSS value context', () => {
  const payload = "red;} body{display:none!important;} .x{color:red";
  const css = buildWebCSS(['overlayScreenWeb'], 0.5, prng(1), { overlayScreenWeb: { overlayOpacity: 0.5, overlayColor: payload } });
  assert.ok(!css.includes('display:none'), 'malicious payload broke out of the CSS declaration');
  assert.ok(!css.includes(payload), 'raw payload leaked into generated CSS unescaped');
});

test('a color param missing the #rrggbb shape is rejected, not just missing the leading #', () => {
  for (const bad of ['javascript:alert(1)', 'red', '#ABC', '#GGGGGG', 'url(evil.com)', 12345, null, {}]) {
    const css = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowColor: bad, glowIntensity: 5, glowSpread: 5 } });
    assert.ok(!String(bad).length || !css.includes(String(bad)), `rejected value "${bad}" still leaked into output`);
  }
});

test('a legitimate #rrggbb color is still respected exactly (no over-rejection)', () => {
  const css = buildWebCSS(['overlayScreenWeb'], 0.5, prng(1), { overlayScreenWeb: { overlayOpacity: 0.6, overlayColor: '#A1B2C3' } });
  assert.ok(css.includes('#A1B2C3'));
});

test('a range param outside its declared min/max is rejected and falls back to the default', () => {
  const tooHigh = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowSpread: 99999, glowColor: '#00E5FF' } });
  const tooLow = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowSpread: -50, glowColor: '#00E5FF' } });
  const nonNumeric = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowSpread: 'nine', glowColor: '#00E5FF' } });
  const atDefault = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowColor: '#00E5FF' } });
  assert.equal(tooHigh, atDefault);
  assert.equal(tooLow, atDefault);
  assert.equal(nonNumeric, atDefault);
});

test('a select param value outside its declared options is rejected', () => {
  const css = buildWebCSS(['cssParticleDrift'], 0.5, prng(1), { cssParticleDrift: { particleCount: 'not-a-real-option', particleColor: '#FFFFFF' } });
  const layerCount = (css.match(/radial-gradient/g) || []).length;
  assert.equal(layerCount, 40, 'should fall back to the default particleCount (40)');
});

test('the same sanitization applies on the image/video chain path too, not just web', () => {
  const buf = new Uint8ClampedArray(16 * 16 * 4).fill(100);
  const effect = getEffectById('asciiShapes', 'image');
  assert.ok(effect, 'asciiShapes should still be registered');
  // A malformed color for an existing, pre-this-session param-aware effect
  // must not throw and must not pass the bad value through to hexToRgb.
  assert.doesNotThrow(() => {
    applyEffectChain(buf, ['asciiShapes'], { mediaType: 'image', W: 16, H: 16, intensity: 0.5 }, prng(1), { asciiShapes: { colorMode: 'single', color: 'not-a-hex-color' } });
  });
});

test('partial/legitimate params for one key do not get wiped by an invalid sibling key', () => {
  const css = buildWebCSS(['neonGlow'], 0.5, prng(1), { neonGlow: { glowColor: '#123456', glowIntensity: 8, glowSpread: 'garbage' } });
  assert.ok(css.includes('#123456'), 'valid glowColor should survive even though glowSpread was invalid');
});
