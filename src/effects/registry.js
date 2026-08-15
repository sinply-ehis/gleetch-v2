import { prng } from '../core/rng.js';
import { CORRUPTION_EFFECTS } from './image/corruption.js';
import { COLOR_TONE_EFFECTS } from './image/color-tone.js';
import { DISTORTION_EFFECTS } from './image/distortion.js';
import { STYLIZE_EFFECTS } from './image/stylize.js';
import { OVERLAY_EFFECTS } from './image/overlay.js';
import { UNCANNY_EFFECTS } from './image/uncanny.js';
import { PRESENCE_EFFECTS } from './image/presence.js';
import { PARTICLE_EFFECTS } from './image/particles.js';
import { GEOMETRIC_EFFECTS } from './image/geometric.js';
import { TEXT_EFFECTS } from './text/corruption.js';
import { CLEAN_TONE_TEXT_EFFECTS } from './text/clean-tone.js';
import { TYPOGRAPHY_TEXT_EFFECTS } from './text/typography.js';
import { POSITION_TEXT_EFFECTS } from './text/position.js';
import { WEB_EFFECTS } from './web/glitch.js';
import { OVERLAY_WEB_EFFECTS } from './web/overlay.js';
import { STYLIZE_WEB_EFFECTS } from './web/stylize.js';
import { AUDIO_EFFECTS } from './audio/corruption.js';
import { AUDIO_CLEAN_TONE_EFFECTS } from './audio/clean-tone.js';

// One flat list of every effect across every media type and category.
// Each entry: { id, label, hint, category, mediaTypes[], fn, needsChannel? }
export const ALL_EFFECTS = [
  ...CORRUPTION_EFFECTS,
  ...COLOR_TONE_EFFECTS,
  ...DISTORTION_EFFECTS,
  ...STYLIZE_EFFECTS,
  ...OVERLAY_EFFECTS,
  ...UNCANNY_EFFECTS,
  ...PRESENCE_EFFECTS,
  ...PARTICLE_EFFECTS,
  ...GEOMETRIC_EFFECTS,
  ...TEXT_EFFECTS,
  ...CLEAN_TONE_TEXT_EFFECTS,
  ...TYPOGRAPHY_TEXT_EFFECTS,
  ...POSITION_TEXT_EFFECTS,
  ...WEB_EFFECTS,
  ...OVERLAY_WEB_EFFECTS,
  ...STYLIZE_WEB_EFFECTS,
  ...AUDIO_EFFECTS,
  ...AUDIO_CLEAN_TONE_EFFECTS,
];

export function getEffectsFor(mediaType) {
  return ALL_EFFECTS.filter((e) => e.mediaTypes.includes(mediaType));
}

export function getCategoriesFor(mediaType) {
  const seen = new Set();
  const categories = [];
  for (const e of getEffectsFor(mediaType)) {
    if (!seen.has(e.category)) { seen.add(e.category); categories.push(e.category); }
  }
  return categories;
}

// Effect ids are only guaranteed unique WITHIN a media type (e.g. 'stutter'
// exists for both text and audio — same concept, different implementation).
// When mediaType is supplied, resolution is scoped to that media type so the
// right function is always picked; omit it only when the id is known to be
// unbiguous (e.g. UI code that already filtered by media type upstream).
export function getEffectById(id, mediaType) {
  if (mediaType) return ALL_EFFECTS.find((e) => e.id === id && e.mediaTypes.includes(mediaType));
  return ALL_EFFECTS.find((e) => e.id === id);
}

// Applies a chain of effect ids in order, each consuming the previous output.
// Different media types call their effect functions with different argument
// shapes, so this builds the right call per effect rather than assuming one
// universal signature (e.g. pixelSort needs an extra `channel` arg; text and
// audio effects don't take W/H at all).
//   ctx.mediaType: 'image' | 'text' | 'audio'
//   ctx.W, ctx.H, ctx.channel   — used for image effects
//   ctx.sampleRate              — used for audio effects
//   ctx.intensity
// effectParams: optional {effectId: {paramKey: value}} map for effects that
// declare their own `params` schema (validated by sanitizeParams below) —
// omit it
// entirely for chains with no param-aware effects, which is every effect
// except the ones that opt into this.
export function applyEffectChain(data, effectIds, ctx, rng, effectParams = {}) {
  let result = data;
  for (const id of effectIds) {
    const effect = getEffectById(id, ctx.mediaType);
    if (!effect) continue;
    const params = effect.params ? sanitizeParams(effect, effectParams[id]) : undefined;
    if (ctx.mediaType === 'image') {
      result = effect.needsChannel
        ? effect.fn(result, ctx.W, ctx.H, ctx.intensity, ctx.channel, rng, params)
        : effect.fn(result, ctx.W, ctx.H, ctx.intensity, rng, params);
    } else if (ctx.mediaType === 'audio') {
      result = effect.fn(result, ctx.sampleRate, ctx.intensity, rng, params);
    } else {
      result = effect.fn(result, ctx.intensity, rng, params);
    }
  }
  return result;
}

// Validates a stored/loaded params value against an effect's own params
// schema, falling back to that field's default for anything missing,
// wrong-typed, or out of range — including a select value that isn't one
// of the declared options, or (importantly) a color value that isn't a
// clean #rrggbb hex string. Recipes are just JSON decoded from a URL
// parameter with no schema enforcement of their own, and some of these
// values get interpolated directly into generated CSS strings (the WEB
// tab's color params) — a crafted recipe's color field could otherwise
// break out of its CSS value context and inject arbitrary rules into
// whatever page the resulting CSS gets applied to. Validating per-field,
// not accepting-or-rejecting the whole params object, means a recipe with
// one bad field still gets every other field it set correctly.
function sanitizeParams(effect, rawParams) {
  const out = {};
  for (const p of effect.params) {
    const v = rawParams?.[p.key];
    out[p.key] = isValidParamValue(p, v) ? v : p.default;
  }
  return out;
}

function isValidParamValue(schema, v) {
  if (v === undefined || v === null) return false;
  if (schema.type === 'color') return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  if (schema.type === 'select') return schema.options.some((o) => o.value === v);
  if (schema.type === 'range') return typeof v === 'number' && Number.isFinite(v) && v >= schema.min && v <= schema.max;
  return false;
}

// Curated chains that are known to look right together — the shuffle
// returns one of these ~30% of the time so a reroll feels designed, and
// composes fresh chains the rest of the time so it still surprises.
// Video signatures deliberately exclude realtimeSafe:false effects:
// continuous playback skips those by default, and a signature that
// silently drops half its chain isn't a signature.
const SIGNATURE_CHAINS = {
  image: [
    ['dataMosh', 'pixelSort', 'duotone'],
    ['waveWarp', 'scanline', 'hueRotate', 'bitFlip'],
    ['chanShift', 'quantize', 'lensAberration', 'stripeBurn'],
    ['void', 'pixelEcho', 'hueRotate'],
    ['levels', 'hueRotate', 'matrixColor', 'pixelEcho'],
    ['crystallize', 'edgeSketch', 'duotone'],
    ['sigil', 'displacementMap', 'invertZones'],
    ['stripeBurn', 'pixelate', 'duotone'],
    ['edgeSketch', 'pixelate', 'quantize', 'hueRotate'],
    ['wraith', 'pixelSort', 'chanShift'],
    ['anomalousSpasm', 'modularMask', 'scanline'],
    ['gaussianBlur', 'displacementMap', 'duotone'],
    ['oilPaint', 'displacementMap', 'gaussianBlur'],
    ['voronoi', 'quantize', 'duotone'],
  ],
  video: [
    ['dataMosh', 'pixelSort', 'duotone'],
    ['scanline', 'waveWarp', 'hueRotate'],
    ['chanShift', 'bitFlip', 'lensAberration'],
    ['stripeBurn', 'pixelEcho', 'matrixColor'],
    ['invertZones', 'quantize', 'duotone'],
    ['edgeSketch', 'lineDistortion', 'levels'],
    ['pixelate', 'dataMosh', 'hueRotate'],
    ['lensWarp', 'scanline', 'bitFlip'],
  ],
  text: [
    ['zalgo', 'stutter', 'caseChaos'],
    ['repeatBlocks', 'scramble', 'noiseInject'],
    ['fontShuffle', 'positionDistortion', 'caseWave'],
    ['segReverse', 'lineChaos', 'marginDrift'],
    ['whitespaceBreathe', 'homoglyph', 'caseChaos'],
  ],
  audio: [
    ['bitCrush', 'tapeWobble', 'dropout'],
    ['stutter', 'noiseInject', 'echo'],
    ['granularScatter', 'outburst', 'feedback'],
    ['chunkRepeat', 'sampleCrush', 'bitCrush'],
    ['softCompress', 'subtleVibrato', 'tapeWobble'],
  ],
  web: [
    ['cssNoiseStatic', 'cssGlitchSlice', 'cssRgbSplit'],
    ['cssScanlines', 'cssVhsWobble', 'cssHueCycle'],
    ['cssDatamoshJump', 'cssInvertPulse', 'neonGlow'],
    ['filmGrain', 'cssParticleDrift', 'cssRgbSplit'],
  ],
};

// Composed chains lean on the glitch-identity categories; everything
// else stays fair game but slightly quieter.
const CATEGORY_WEIGHTS = { corruption: 1.6, distortion: 1.6, stylize: 1.3, 'color-tone': 1.1 };
const DEFAULT_CATEGORY_WEIGHT = 1;

function weightedCategoryPick(rng, categories) {
  const weights = categories.map((c) => CATEGORY_WEIGHTS[c] ?? DEFAULT_CATEGORY_WEIGHT);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < categories.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return categories[i];
  }
  return categories[categories.length - 1];
}

function pickFromCategory(rng, idsByCategory, category, taken) {
  const candidates = (idsByCategory.get(category) || []).filter((id) => !taken.has(id));
  if (!candidates.length) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

// Picks a dynamic chain of effect ids for a media type (used by the shuffle
// button). Two modes: ~30% of rerolls return a curated SIGNATURE_CHAINS
// combo (occasionally grown with one complementary effect), the rest are
// composed fresh — an anchor category chosen with glitch-identity weights,
// then each step prefers a category different from the last so effects
// complement instead of cancelling. Never repeats an id within a chain.
//   options.exclude         — ids to avoid (pass the current chain so a
//                             reroll can never return the same chain twice)
//   options.signatureChance — 0..1, default 0.3
export function randomEffectSelection(mediaType, rng, options = {}) {
  const { minCount = 2, maxCount = 4, exclude = [], signatureChance = 0.3 } = options;
  const pool = getEffectsFor(mediaType).filter((e) => !exclude.includes(e.id));
  if (!pool.length) return [];
  const taken = new Set(exclude);

  if (rng() < signatureChance) {
    const signatures = (SIGNATURE_CHAINS[mediaType] || []).filter((chain) =>
      chain.every((id) => pool.some((e) => e.id === id)));
    if (signatures.length) {
      const chain = [...signatures[Math.floor(rng() * signatures.length)]];
      chain.forEach((id) => taken.add(id));
      if (rng() < 0.25 && chain.length < maxCount) {
        const growPool = mediaType === 'video' ? pool.filter((e) => e.realtimeSafe !== false) : pool;
        const rest = growPool.filter((e) => !taken.has(e.id));
        if (rest.length) {
          chain.push(rest[Math.floor(rng() * rest.length)].id);
        }
      }
      return chain;
    }
  }

  const byCategory = new Map();
  for (const e of pool) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category).push(e.id);
  }
  const categories = Array.from(byCategory.keys());
  const count = Math.min(pool.length, minCount + Math.floor(rng() * (maxCount - minCount + 1)));
  const chain = [];
  let lastCategory = null;
  while (chain.length < count) {
    let category;
    if (!lastCategory || rng() < 0.15) {
      category = weightedCategoryPick(rng, categories);
    } else {
      const others = categories.filter((c) => c !== lastCategory);
      category = others.length ? weightedCategoryPick(rng, others) : lastCategory;
    }
    const id = pickFromCategory(rng, byCategory, category, taken);
    if (id === null) {
      const rest = pool.filter((e) => !taken.has(e.id));
      if (!rest.length) break;
      const e = rest[Math.floor(rng() * rest.length)];
      chain.push(e.id);
      taken.add(e.id);
      lastCategory = e.category;
    } else {
      chain.push(id);
      taken.add(id);
      lastCategory = category;
    }
  }
  return chain;
}

// Video-specific chain runner. Most effects (pixel sort, datamosh, wave warp,
// channel drift...) are meant to look ALIVE frame to frame, so they get a
// seed tied to playback time — that's the whole appeal of glitching video.
// But a handful of effects use randomness to make a one-time STYLE choice
// rather than a per-frame glitch decision (duotone's hue pair, lens warp's
// bulge-vs-pinch direction, line distortion's wave shape, hue rotate's
// direction) — those are flagged `stableAcrossFrames` in their registry
// entry and get a seed tied to the clip only, so the choice holds for the
// whole video instead of flickering between random picks every frame.
// Heavy effects (oilPaint, voronoi, overlay) flagged realtimeSafe:false can
// be throttled via shouldProcessHeavy for quality tiers. Default FALSE for
// backward compatibility — continuous playback skips heavy effects.
export function applyVideoEffectChain(data, effectIds, ctx, clipSeed, frameSeed, effectParams = {}, shouldProcessHeavy = false) {
  let result = data;
  for (const id of effectIds) {
    const effect = getEffectById(id, 'video');
    if (!effect) continue;
    if (effect.realtimeSafe === false && !shouldProcessHeavy) continue;
    const rng = prng(effect.stableAcrossFrames ? clipSeed : frameSeed);
    const params = effect.params ? sanitizeParams(effect, effectParams[id]) : undefined;
    result = effect.needsChannel
      ? effect.fn(result, ctx.W, ctx.H, ctx.intensity, ctx.channel, rng, params)
      : effect.fn(result, ctx.W, ctx.H, ctx.intensity, rng, params);
  }
  return result;
}

// Web effects generate CSS rather than transform data, so they get their
// own aggregator. `animation` contributions are merged into ONE combined
// shorthand on .gleetch-fx (comma-separated) so effects animating different
// properties genuinely run at once; effects sharing a property (see the
// composability note in effects/web/glitch.js) fall back to normal CSS
// cascade — later-selected wins for that specific property, not a crash or
// silently-dropped effect.
export function buildWebCSS(effectIds, intensity, rng, effectParams = {}) {
  const keyframeBlocks = [];
  const staticRules = [];
  const animations = [];
  for (const id of effectIds) {
    const effect = getEffectById(id, 'web');
    if (!effect) continue;
    const params = effect.params ? sanitizeParams(effect, effectParams[id]) : undefined;
    const result = effect.fn(intensity, rng, params);
    if (result.keyframes) keyframeBlocks.push(result.keyframes);
    if (result.rules) staticRules.push(result.rules);
    if (result.animation) animations.push(result.animation);
  }
  const animationRule = animations.length ? `.gleetch-fx{animation:${animations.join(', ')};}` : '';
  return [...keyframeBlocks, ...staticRules, animationRule].filter(Boolean).join('\n');
}
