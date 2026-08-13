import { prng } from '../core/rng.js';
import { CORRUPTION_EFFECTS } from './image/corruption.js';
import { COLOR_TONE_EFFECTS } from './image/color-tone.js';
import { DISTORTION_EFFECTS } from './image/distortion.js';
import { STYLIZE_EFFECTS } from './image/stylize.js';
import { OVERLAY_EFFECTS } from './image/overlay.js';
import { UNCANNY_EFFECTS } from './image/uncanny.js';
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

// Picks a random subset of effect ids for a media type (used by the shuffle button).
export function randomEffectSelection(mediaType, rng, minCount = 2, maxCount = 4) {
  const pool = getEffectsFor(mediaType).map((e) => e.id);
  const count = Math.min(pool.length, minCount + Math.floor(rng() * (maxCount - minCount + 1)));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
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
export function applyVideoEffectChain(data, effectIds, ctx, clipSeed, frameSeed, effectParams = {}) {
  let result = data;
  for (const id of effectIds) {
    const effect = getEffectById(id, 'video');
    if (!effect || effect.realtimeSafe === false) continue;
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
