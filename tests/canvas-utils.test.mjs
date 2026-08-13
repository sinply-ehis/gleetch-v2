import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAdaptiveSize } from '../src/core/canvas-utils.js';

// Regression test for a real bug: canvas dimensions were hardcoded to a
// fixed 512x512 square, so uploading e.g. a 1920x1080 photo silently
// cropped it into a square on export. computeAdaptiveSize replaced that.
test('computeAdaptiveSize preserves aspect ratio', () => {
  const dims = computeAdaptiveSize({ naturalWidth: 1920, naturalHeight: 1080 }, 1024);
  const sourceRatio = 1920 / 1080;
  const outputRatio = dims.W / dims.H;
  assert.ok(Math.abs(sourceRatio - outputRatio) < 0.01, `expected ratio ~${sourceRatio}, got ${outputRatio}`);
});

test('computeAdaptiveSize respects the maxDim cap', () => {
  const dims = computeAdaptiveSize({ naturalWidth: 4000, naturalHeight: 3000 }, 1024);
  assert.ok(Math.max(dims.W, dims.H) <= 1024, `expected longer edge <= 1024, got ${Math.max(dims.W, dims.H)}`);
});

test('computeAdaptiveSize does not upscale images smaller than maxDim', () => {
  const dims = computeAdaptiveSize({ naturalWidth: 300, naturalHeight: 200 }, 1024);
  assert.equal(dims.W, 300);
  assert.equal(dims.H, 200);
});

test('computeAdaptiveSize handles video-shaped input (videoWidth/videoHeight)', () => {
  const dims = computeAdaptiveSize({ videoWidth: 1280, videoHeight: 720 }, 1024);
  assert.equal(dims.W, 1024);
  assert.equal(dims.H, 576);
});
