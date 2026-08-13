# Pareidolia Round — Plan + Outcome

PURPOSE: Worksheet for the pareidolia displacement round (engine port, registry
  wiring, sidebar scroll fix, tests). One file per round; append OUTCOME when
  the round lands.
OWNS: gleetch-v2 effect work.
READ-WHEN: resuming pareidolia tuning, or auditing what this round touched.
KEY-FILES: src/effects/image/pareidolia.js, uncanny.js, color-tone.js,
  src/index.css, tests/pareidolia.test.mjs, tests/registry.test.mjs.
INVARIANTS: faithful reference port; additive only — zero changes to existing
  effect behavior; all new effects covered by real tests.
GOTCHAS: the reference engine's tension field saturates at small image sizes
  (samples clamp to image edges) — tests must use realistic sizes (64+ px).
UPDATED: 2026-08-13

## Plan
1. Fix sidebar clipping bug (whole sidebar must scroll, not just .algo-scroll).
2. Port the reference pareidolia displacement engine (5 wave functions,
   face-settings field, per-channel chromatic split).
3. Expose it as 4 faces: MODULAR MASK, ANOMALOUS SPASM, SCREAM VORTEX
   (new) + PHANTOM FACE (existing overlay, unchanged).
4. Extract the reference's color-math as a shared applyColorRemap + a
   realtime-safe MATRIX COLOR effect.
5. Wire into registry (image + video tag, realtimeSafe:false for the heavy
   faces, stableAcrossFrames), test, build, run.

## Deviations from plan (with reasons)
- cyberTint gets a gentle green time-pulse (sin(time*0.05 + luma*0.02)*14) —
  the only deliberate departure from the reference: without it the mode
  ignores `time` and MATRIX COLOR would render identically across clips,
  violating the per-clip style-pick rule enforced by the stableAcrossFrames
  test. Look is unchanged at a glance.
- Faces follow the established "full-quality frame capture only" tier
  (mediaTypes image+video, realtimeSafe:false — like voronoi/oilPaint)
  instead of image-only: they're selectable for capture but skipped in live
  playback, consistent with existing heavy effects.
- stableAcrossFrames test buffer moved 16x16 -> 96x96 (matrixColor added to
  the list): at 16px the faces' tension field clamps every sample to an
  image edge and output saturates identically for any clip seed — the test
  itself became degenerate, not the engine.

## Outcome
- Sidebar scroll fixed (index.css: .sidebar overflow-y:auto + scrollbar
  styling; children shrink-proof so short windows scroll instead of squash).
- pareidolia.js: faceParams()/FACE_DEFAULTS/FACE_SETTINGS/pareidoliaGlitch(),
  waveDisplacement() faithful port (sin_r, tangent_spike, mod_chaos,
  polar_spiral, fractal_sin), identity at chaos=0+split=0+Native+64 levels.
- color-tone.js: applyColorRemap() shared with the faces; MATRIX COLOR
  effect (mode select + levels posterize), realtime-safe.
- uncanny.js: 3 new faces via faceEffect() factory.
- Evidence: 95/95 tests pass (7 new: multi-seed validity, identity, not-a-
  no-op, determinism, schema+flags, clip-stability semantics, posterize);
  `npm run build` clean; dev server serves HTTP 200; lint clean except one
  PRE-EXISTING warning in src/patterns/signal.js:13 (unused 'bh').

## Left undone / future
- Verify the four faces by eye on a real photo in the UI (needs a human —
  engine correctness is test-proven, aesthetics are not).
- If the app gains realtime video previews at small sizes, consider a
  size-normalized tension falloff so the faces don't saturate below ~64px.
