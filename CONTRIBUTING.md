# Contributing to Gleetch

Thanks for taking a look. This is a small, opinionated codebase — reading
this file first will save you a rewrite later.

Before anything else, this project follows **[AGENT.md](./AGENT.md)** as
its engineering constitution — how decisions get made, what "done" means.
**[APP_MAP.md](./APP_MAP.md)** documents what depends on what (read it
before touching a shared system like the effects registry). **[DESIGN.md](./DESIGN.md)**
is the actual visual language. This file (CONTRIBUTING.md) is the
practical how-to; those three are the reasoning behind the how-to.

## Setup

```bash
git clone <your-fork-url>
cd gleetch
npm install
npm run dev
```

Before opening a PR:

```bash
npm run lint   # ESLint 9 (flat config), incl. the modern react-hooks
               # rule set (rules-of-hooks, exhaustive-deps, and the
               # stricter set-state-in-effect / immutability / refs
               # rules — these caught 3 real issues during development,
               # see CHANGELOG.md's [Unreleased] section for what and why)
npm test       # node --test, no test framework dependency
npm run build  # must succeed cleanly
```

Then review **[BUILD_CHECKLIST.md](./BUILD_CHECKLIST.md)** against your
change before calling it done — for a small fix, just the sections it
actually touches; for anything touching a shared system, every section
APP_MAP.md flags as affected. This isn't box-checking theater: a real
audit pass against this exact checklist caught a genuine touch-target
regression (a new button shipped at 34px against the app's own 44px
minimum) and a missing success-state across four existing copy buttons —
see CHANGELOG.md's most recent entry for both.

CI runs all three on every push and PR (`.github/workflows/ci.yml`) against
Node 18.x and 20.x. A PR won't merge if any of them fail.

## Conventions (please actually follow these)

- **200 lines per file, 40 lines per function.** This isn't arbitrary —
  it's what makes `effects/registry.js` legible as a single source of
  truth instead of a maze. If a file is creeping past 200 lines, that's a
  signal to extract a sub-component or hook, not to keep going. See
  `components/useVideoAudioTrack.js` and `components/useVideoExport.js`
  for an example of extracting a hook specifically to stay under the cap.
- **No placeholder code, no TODOs left in.** If something isn't finished,
  it doesn't go in.
- **Deterministic randomness only.** Every effect takes an `rng` from
  `core/rng.js`'s `prng(seed)` — never `Math.random()` inside an effect
  function. The whole app's promise is "same seed, same output"; a stray
  `Math.random()` breaks that silently.
- **Verify Unicode data against a real source, not memory.** Two real bugs
  shipped from getting Unicode character tables wrong: a surrogate-pair
  indexing bug in `FONT SHUFFLE` (astral characters are 2 UTF-16 units;
  raw string indexing slices them in half) and an upside-down character
  table that needed cross-referencing against a maintained reference
  rather than recalled from memory. If you're adding a Unicode trick,
  verify the actual codepoints against an authoritative source and write
  a regression test — see `tests/unicode-text-effects.test.mjs`.

## Adding a new effect

This is the most common contribution, and the architecture is built
around making it require exactly two things:

1. **A function.** Signature depends on media type:
   - image/video: `(buf, W, H, intensity, rng) => buf`
   - text: `(text, intensity, rng) => text`
   - audio: `(channelData, sampleRate, intensity, rng) => channelData`
   - web (generates CSS, doesn't transform data): `(intensity, rng) =>
     { keyframes?, animation?, rules? }`
2. **A registry entry**: `{ id, label, hint, category, mediaTypes: [...],
   fn }` in the relevant `effects/<media>/<file>.js`, exported and spread
   into `effects/registry.js`.

That's it — no new UI code. `AlgoPanel` reads the registry directly and
groups/styles by category automatically.

Before you add one, check `patterns/registry.js` (100+ existing patterns)
and the existing effect list for **id collisions and conceptual overlap**.
Two things shipped and had to be reworked because of this: `wood_grain`
and `water_ripple` were exact id collisions with existing patterns (would
have broken the build), and several others (`marble_veins`, `static_tv`,
`sand_dune`) were close enough to existing patterns that they were
replaced rather than shipped as near-duplicates. `tests/patterns.test.mjs`
has a permanent collision check — but conceptual redundancy is a judgment
call a test can't catch, so look before adding.

**Video-specific:** if your effect uses `rng()` to make a one-time style
choice (a hue, a direction, a position) rather than a per-frame glitch
decision, tag it `stableAcrossFrames: true` in its registry entry.
Without it, video mode's per-frame-seeded rng will re-roll that "style"
choice 30 times a second and it'll flicker between random picks instead of
holding steady for the clip. See `tests/registry.test.mjs`'s
`stableAcrossFrames` test for the exact failure mode this catches — and
note that test's fixture uses a spatially-varied, saturated buffer
specifically because a uniform solid color is degenerate for testing
*both* hue-based effects (no hue to rotate) and spatial-warp effects
(moving positions is invisible when every position holds the same value).

## Testing

`tests/` uses Node's built-in test runner (`node:test`) — no Jest/Vitest
dependency, consistent with the project's zero-new-dependencies stance.
`tests/helpers/mock-canvas.mjs` provides a minimal (not pixel-accurate)
Canvas2D mock for testing DOM-dependent code (patterns, overlay effects)
without a browser — it exists to make `document.createElement('canvas')`
callable in a plain Node test, not to verify pixel-perfect rendering.

If you fix a bug, add a regression test for it in the same PR. Several
existing tests are regression tests for real bugs found during
development — `tests/rng.test.mjs`'s divisor check,
`tests/canvas-utils.test.mjs`'s aspect-ratio check — and they're named and
commented to explain *why* they exist, not just what they assert. Please
keep that pattern.

## Style

No TypeScript, no CSS framework, no state management library — this is
intentional, not an oversight. Plain React state/hooks, plain CSS in
`src/index.css`, plain JS. If your contribution needs a new dependency,
that's a conversation to have in an issue before a PR, not something to
introduce unilaterally.
