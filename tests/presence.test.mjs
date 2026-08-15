import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectsFor, applyEffectChain, applyVideoEffectChain } from '../src/effects/registry.js';
import { prng } from '../src/core/rng.js';

// The presence family (VOID / SIGIL / WRAITH) replaced the removed
// PHANTOM FACE slot: eerie overlays that are cheap enough for real-time
// video (NOT realtimeSafe:false), pick their style once per clip
// (stableAcrossFrames), and share one param shape. These tests pin the
// slot's contract so a future replacement can't silently drift.

const PRESENCE_IDS = ['void', 'sigil', 'wraith'];

function makeBuf(W, H, v = 120) {
  const buf = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < buf.length; i += 4) { buf[i] = v; buf[i + 1] = v; buf[i + 2] = v; buf[i + 3] = 255; }
  return buf;
}

function presenceEffect(id) {
  return getEffectsFor('image').find((e) => e.id === id);
}

test('presence effects are registered for image and video exactly once, overlay category, real-time safe', () => {
  for (const id of PRESENCE_IDS) {
    for (const mt of ['image', 'video']) {
      const matches = getEffectsFor(mt).filter((e) => e.id === id);
      assert.equal(matches.length, 1, `${id}/${mt}: expected exactly one registration`);
    }
    const e = presenceEffect(id);
    assert.equal(e.category, 'overlay', `${id}: expected overlay category`);
    assert.notEqual(e.realtimeSafe, false, `${id}: must run in live video playback`);
    assert.equal(e.stableAcrossFrames, true, `${id}: style pick must hold across frames`);
  }
});

test('presence effects expose the shared position/size/glow/color param schema', () => {
  const keys = ['posX', 'posY', 'size', 'glowIntensity', 'glowColor'];
  for (const id of PRESENCE_IDS) {
    const e = presenceEffect(id);
    assert.ok(Array.isArray(e.params), `${id}: needs a params schema`);
    for (const key of keys) {
      assert.ok(e.params.some((p) => p.key === key), `${id}: missing param ${key}`);
    }
  }
});

test('presence effects are identity at intensity 0', () => {
  for (const id of PRESENCE_IDS) {
    const e = presenceEffect(id);
    const src = makeBuf(24, 24);
    const out = e.fn(src, 24, 24, 0, prng(11));
    assert.deepEqual(Array.from(out), Array.from(src), `${id}: must not touch pixels at intensity 0`);
  }
});

test('presence effects are deterministic per seed and vary across seeds', () => {
  const W = 32, H = 32;
  for (const id of PRESENCE_IDS) {
    const e = presenceEffect(id);
    const a = e.fn(makeBuf(W, H), W, H, 0.7, prng(123));
    const b = e.fn(makeBuf(W, H), W, H, 0.7, prng(123));
    assert.deepEqual(Array.from(a), Array.from(b), `${id}: same seed must produce the same output`);
    const c = e.fn(makeBuf(W, H), W, H, 0.7, prng(456));
    assert.notDeepEqual(Array.from(a), Array.from(c), `${id}: different seeds must produce different output`);
  }
});

test('presence effects actually change the image at intensity > 0 (not no-ops)', () => {
  for (const id of PRESENCE_IDS) {
    const e = presenceEffect(id);
    const src = makeBuf(32, 32, 100);
    const out = e.fn(src, 32, 32, 0.8, prng(7));
    assert.notDeepEqual(Array.from(out), Array.from(src), `${id}: expected visible change at intensity 0.8`);
  }
});

test('presence params are respected: size and color move the output', () => {
  const W = 32, H = 32;
  const small = presenceEffect('void').fn(makeBuf(W, H), W, H, 0.7, prng(1), { size: 0.15 });
  const big = presenceEffect('void').fn(makeBuf(W, H), W, H, 0.7, prng(1), { size: 0.6 });
  assert.notDeepEqual(Array.from(small), Array.from(big), 'void: size param must change the footprint');

  const red = presenceEffect('sigil').fn(makeBuf(W, H), W, H, 0.7, prng(2), { glowColor: '#FF0000' });
  const blue = presenceEffect('sigil').fn(makeBuf(W, H), W, H, 0.7, prng(2), { glowColor: '#0000FF' });
  assert.notDeepEqual(Array.from(red), Array.from(blue), 'sigil: glowColor param must change the tint');

  const offCenter = presenceEffect('wraith').fn(makeBuf(W, H), W, H, 0.7, prng(3), { posX: 0.9, posY: 0.9 });
  const center = presenceEffect('wraith').fn(makeBuf(W, H), W, H, 0.7, prng(3), { posX: 0.5, posY: 0.5 });
  assert.notDeepEqual(Array.from(offCenter), Array.from(center), 'wraith: position params must move the smear');
});

test('presence effects hold steady within a clip but vary across clips (stableAcrossFrames via applyVideoEffectChain)', () => {
  const ctx = { W: 48, H: 48, intensity: 0.7 };
  for (const id of PRESENCE_IDS) {
    const clipSeed = 555;
    const frame1 = applyVideoEffectChain(makeBuf(48, 48), [id], ctx, clipSeed, clipSeed + 100);
    const frame2 = applyVideoEffectChain(makeBuf(48, 48), [id], ctx, clipSeed, clipSeed + 9000);
    assert.deepEqual(Array.from(frame1), Array.from(frame2), `${id}: flickered within the same clip`);

    const clipA = applyVideoEffectChain(makeBuf(48, 48), [id], ctx, 111, 111 + 100);
    const clipB = applyVideoEffectChain(makeBuf(48, 48), [id], ctx, 999, 999 + 100);
    assert.notDeepEqual(Array.from(clipA), Array.from(clipB), `${id}: did not vary across different clips`);
  }
});

test('presence effects handle tiny/odd dimensions without NaN', () => {
  for (const dims of [[1, 1], [5, 1], [1, 5], [3, 7]]) {
    const [W, H] = dims;
    for (const id of PRESENCE_IDS) {
      const e = presenceEffect(id);
      const out = e.fn(makeBuf(W, H, 128), W, H, 1, prng(9));
      for (let i = 0; i < out.length; i++) assert.ok(!Number.isNaN(out[i]), `${id} ${W}x${H}: NaN at index ${i}`);
    }
  }
});
