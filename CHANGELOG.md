# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versioning
follows [Semantic Versioning](https://semver.org/).

Versions 1.0.0 and 2.0.0 predate this file — they're reconstructed from
project history rather than tracked contemporaneously, so they're
summarized rather than itemized to the same depth as 3.0.0 onward.

## [3.1.0] — 2026-08-30

### Added
- **Editable image format** — the VISUAL canvas is no longer fixed square. New `FORMAT` row in the sidebar (`src/core/formats.js`, `src/components/VisualTab.jsx:211`, `src/index.css:162`): `ORIGINAL` (source ratio, or 1:1 for generate), `1:1`/`4:3`/`3:4`/`3:2`/`2:3`/`16:9`/`9:16`/`21:9`/`9:21`, and `CUSTOM` with explicit `W×H` inputs (64–2048, capped). `COVER` (fill & crop via `drawImageCover`) / `CONTAIN` (letterbox on `#0A0A1C`) toggle for uploads. Quality-gated via `quality.maxCustomDim` (1024/1536/2048 per tier) with `· capped` hint. Recipe carries `f:{id,w,h,fit}` (`src/core/recipe.js:1`), old links decode cleanly. Export filename now `gleetch-{seed}-{W}x{H}.png`. Video procedural uses the same global canvas sizing (16:9 from `videoMaxDim`).
- **Procedural video (no import needed) + global randomness** — `VIDEO` tab gains a `✦ GENERATE` mode identical to VISUAL (`src/components/VideoTab.jsx:25`, `src/core/procedural-video.js:1`): `renderProceduralVideoFrame()` — clip-stable pattern set from the **global `seed`** (`src/gleetch.jsx:27`) plus time-evolving drift (`fbm` + micro-rotation), layered via `maxLayers` (quality-gated 1/2/3). `SPACE` and new `←/→` seed-walk (`gleetch.jsx:64`) re-roll both image and video together. `GENERATE` auto-plays, `PLAY PROCEDURAL` toggles, and `⬇ EXPORT VIDEO` records the live canvas for 5s via `canvas.captureStream` (`src/effects/video/export.js:23` `exportProceduralVideo`). `PROCEDURAL VIDEO · global seed` hint and `global seed` badge make the shared source explicit. `SEED_MAX` lifted `999997 → 2147483647` with `crypto.getRandomValues` (`src/core/constants.js:2`).
- **Logo & favicon** — master `public/favicon.svg` (RGB ghost `GLEETCH` + slice tears on `#0A0A1C`) and wordmark `src/assets/logo.svg` (`DESIGN.md:14`). `index.html:6` links `favicon.svg` / `favicon-32.png` / `apple-touch-icon.png` (`180`) + `icon-192/512.png` (generated via canvas, no `.ico` per request). Header now renders `<img src={logoUrl}>` with `idle`/`burst` on `.logo-img` (`src/gleetch.jsx:76`, `src/index.css:8`).
- **29 genuinely new image/video effects** — not reskins, each its own pixel math, all `mediaTypes:['image','video']` and `intensity 0 → identity` via `src/core/blend.js:1` `lerpBuffer`:
  - *Painterly* `src/effects/image/painterly.js`: `WATERCOLOR BLEED` (diffusion + paper `fbm`), `OIL IMPASTO` (ridged emboss), `INK WASH` (sumi-e monochrome, mostly negative space)
  - *Print* `src/effects/image/print.js`: `RISOGRAPH` (limited palette misregistered), `SCREEN PRINT` (Warhol separations), `MANGA SCREENTONE` (halftone dots + Sobel linework), `LINE CONTOUR` (single-weight continuous line)
  - *Geometric* `src/effects/image/geometric2.js`: `LOW POLY` (triangulated flat planes), `MANDALA` (kaleidoscope radial, `stableAcrossFrames`), `LEADED GLASS` (bold lead lines, large panes — distinct from `VORONOI`)
  - *Photographic* `src/effects/image/photoTone.js`: `CYANOTYPE` (prussian-blue monochrome), `DUOTONE GRADE` (pair `midnight/ember/aqua/blush`, `stableAcrossFrames`)
  - *Textile* `src/effects/image/textile.js`: `CROSS STITCH` (X-stitch blocks), `WOVEN TAPESTRY` (warp/weft sinusoid)
  - *Corruption* `src/effects/image/corruption2.js`: `PIXEL SORT II` (banded), `DATABEND` (jagged byte slices), `CHANNEL TEAR` (extreme tear + jitter), `MACROBLOCK ROT` (re-compression ghosts), `SCANLINE WARP` (VHS rolling bands), `GHOST TRAIL` (sideways echoes), `STATIC BLOOM` (half-dissolve to TV static)
  - *Craft* `src/effects/image/craft.js`: `TRUE ASCII` (**stylized dots**, not literal characters — density → dot radius `cell*0.08–0.42*dotSize`, `dotMode` luma/color/mono, per user correction), `BLUEPRINT` (cyan on blueprint blue + grid), `WOODCUT` (cross-hatch density), `VORONOI MOSAIC` (seed-shattered, `realtimeSafe:false`), `TOPOGRAPHIC` (contour bands), `CIRCUIT TRACE` (PCB traces + nodes), `CONSTELLATION` (star-map), `THERMAL` (false-color heat)
  Wired in `src/effects/registry.js:2` (`ALL_EFFECTS` 37→66 image/video, total 77→ ~112), 7 new signature chains + 7 presets (`WATERCOLOR`/`RISO`/`POLY`/`TAPESTRY`/`GLITCH2`/`CRAFT`/`CYANO` in `src/effects/presets.js:1`).
- **Infinite procedural engine** — `src/core/procedural.js:22` now `clearRect` + quality-gated layered composition (1–3 patterns, distinct families, blend modes `screen/multiply/overlay/soft-light`, `maxLayers` per tier). `SEED_MAX` bump + `prng` MurmurHash3 finalizer (`src/core/rng.js:4`) so sequential seeds (`seed` / `seed+1` from walk) give uncorrelated first values (500 seeds → 119/120 distinct patterns vs 24 before). `randomEffectSelection` `signatureChance` `0.3→0.15` + jitter + uniform `CATEGORY_WEIGHTS:{}` for true randomness (`src/effects/registry.js:207`).
- **Intensity contract fix** — new `src/core/blend.js:1` guarantees `intensity 0 = identity` (bitwise), `1 = full`, linear `lerpBuffer` in between. Fixed `quantize` (now 2-level posterize + lerp), `halftoneFilter`/`dotMosaic`/`asciiShapes`/`oilPaint`/`gaussianBlur`/`pixelate`/`voronoi` (`src/effects/image/*.js`) — previously `halftone`/`dotMosaic` always drew paper/white and `quantize` always quantized even at `0.05`. Tests updated to assert at `intensity:1` for exact-color checks (`tests/ascii-shapes.test.mjs:32`, `tests/dot-mosaic.test.mjs:38`, `tests/geometric-particle-effects.test.mjs:47`). `VideoTab` procedural preview also lerps (`src/components/VideoTab.jsx:85`).

### Fixed
- **Dimensions changing (9:16 etc) did nothing** — `VisualTab.jsx:180` `applyFmt` used stale closure `setFmt({ ...fmt, id })`; rapid clicks kept old `w/h`. Now `setFmt(prev => ({ ...prev, id }))`. Verified `resolveDims` arithmetic (9:16@512=288×512, 16:9@512=512×288, custom capped) and canvas `width={dims.W} height={dims.H}` triggers `run()` via `dimsMemo`.
- **Effects all routed to “the one with lines”** — `prng` LCG had poor avalanche (seed 1 vs 2 diff `0.0003` → `rng()*120` diff `0.04`), so shuffle/pattern picks collapsed to ~24 patterns. Added Murmur finalizer to `prng` and removed weighted `CATEGORY_WEIGHTS` bias (was `corruption:1.6/distortion:1.6` → line-heavy `lowPoly/mandala/lineDistortion` dominated). Shuffle now uses `prng(randomSeed())` (`VisualTab.jsx:149`, `VideoTab.jsx:283`, `AudioTab.jsx:111`, `TextTab.jsx:31`, `WebTab.jsx:62`) via `crypto` instead of `Date.now()%999999`. Also allowed empty effect chain (`withoutOrRefill` no longer refills) so clean base is possible. Verified shuffle over 500 seeds hits all 66 ids uniformly.
- **Video (and image) base showing lines when should be none** — `renderProcedural` / `renderProceduralVideoFrame` lacked `clearRect(0,0,W,H)` before drawing, leaving previous frame ghost lines; now cleared. Procedural video `off` canvas handling also fixed in `tests/helpers/mock-canvas.mjs:62` (`drawImage` shim).
- **Random getting stuck in fixed state at times** — `prng` sequential seeds still correlated, plus `VideoTab` shuffle still used `Date.now`, `Audio/Text/Web` shuffles also stuck, and procedural video `procTimeRef` never reset on seed change so new seed rendered at old elapsed time (appeared frozen). Fixed: `prng` now hashes seed (119/120 distinct patterns for 500 sequential seeds), all shuffles use `randomSeed()` (`crypto`), `VideoTab` `shuffle` fixed, `procTimeRef`/`procStartRef` reset to `0`/`performance.now()` on seed/effect change (`VideoTab.jsx:182`), and `stableAcrossFrames` test made robust to not rely on a single seed pair (`tests/registry.test.mjs:131`). Verified: `seed` walk `←/→` now gives uncorrelated patterns, `SPACE` global reroll changes both image+video together, 500 shuffles hit all 66 ids, and 111 tests pass.

## [Unreleased]

### Added
- **Web tab / Audio tab per-effect params wiring** — extends the params/
  color system (previously only on `VisualTab`/`VideoTab`) to `WebTab`
  and `AudioTab`, closing the one deliberate gap left by that system's
  first rollout (see below). Added a `range` type to `ParamControls`
  (previously only `select`/`color`) — almost every effect added in this
  round needs a numeric slider, not just a dropdown or swatch.
- **6 new WEB effects**: `OVERLAY SCREEN` / `OVERLAY MULTIPLY` /
  `OVERLAY BLEND` (one shared mix-blend-mode implementation, opacity +
  color params), `PARTICLE DRIFT` (percentage-positioned radial-gradient
  dust field — deliberately not the classic box-shadow "starfield" trick,
  which only holds up correctly at one assumed element size, and this
  needs to work on whatever element `.gleetch-fx` ends up applied to),
  `NEON GLOW` (stacked drop-shadow glow with a subtle flicker), `FILM
  GRAIN` (coarser, desaturated turbulence noise — a genuinely different
  technique from the existing `NOISE STATIC`, not a reskin of it).
- **3 new IMAGE/VIDEO effects**: `PARTICLE DISSOLVE` (fbm noise-threshold
  disintegration with an optional tinted glowing edge band), `VORONOI`
  and `CRYSTALLIZE` (share one Voronoi-tessellation implementation —
  jittered-grid cell centers, 3×3-neighbor nearest-cell search —
  `VORONOI` fills each cell with its source-average color, `CRYSTALLIZE`
  keeps the source image and draws only the facet outlines over it).
  Both new geometric effects flagged `realtimeSafe: false`: measured
  (not assumed) at 22–40ms/frame on a 512×512 buffer versus ~13ms for
  the existing realtime-safe baseline effect — too slow to trust for
  continuous video playback, so full-quality-frame-capture only, same
  as `OIL PAINT`.
- **1 new AUDIO effect**: `GRANULAR SCATTER` — chops the buffer into
  grains and reorders them with bounded-distance swaps; a genuinely
  different technique from `STUTTER` (repeats chunks in place) and
  `DATAMOSH` (pastes one source chunk to many destinations). First
  param-aware audio effect.
- Effect total: 67 → 77 (see `README.md`, recomputed from the registry
  rather than incremented by hand).
- **Per-effect custom parameters** — the first capability in the registry
  beyond the universal `[intensity + seed]` interface every one of the
  previous 66 effects shares. An effect can now optionally declare
  `params` (e.g. a color-mode select, a color swatch); `applyEffectChain`
  and `applyVideoEffectChain` pass the current values through as an
  extra trailing argument, and `ActiveChainList.jsx` renders generic
  controls for whichever active effect declares them — driven entirely
  by the schema, not hardcoded to one effect, so the next effect that
  needs a custom control is a small addition, not another one of these.
  Fully backward compatible: effects without `params` never receive or
  declare the extra argument, verified by rerunning the full suite
  against all 66 pre-existing effects, none of which changed behavior.
  Recipe sharing carries the values too (`decodeRecipe` needed zero
  changes — it was already generic enough to pass an extra field
  through untouched — verified with a dedicated round-trip test rather
  than assumed).
- **`ASCII SHAPES`** — same density-by-darkness placement as HALFTONE
  (dark = bigger mark), the mechanism real ASCII art uses to pick a
  dense vs. sparse character per region, but color is fully decoupled
  from the source photo — the first param-aware effect, with `single`
  (a picked color), `palette` (built-in Gleetch-accent palette), and
  `random` modes. Near-white cells are skipped entirely rather than
  drawn as a shrinking dot, so light areas read as true blank space —
  the way ASCII art actually leaves empty space, unlike HALFTONE/
  DOT MOSAIC which always draw something. On video, deliberately not
  `stableAcrossFrames`, so color naturally cycles with playback since
  `frameSeed` is time-derived (`VideoTab.jsx` already ties it to
  `currentTime`) — no new time-awareness needed for that part.
  Caught and fixed a real bug via its own test suite before shipping:
  the near-white skip was checking derived radius against a fixed
  threshold, but radius is floored at a value that scales with cell
  size/intensity, so a dot got drawn for pure white input at most
  intensity settings, silently defeating the entire point of that
  behavior. Fixed to check luminance directly instead.
- **DevTools console snippet** — new primary method for applying gleetch
  live to a page you don't own (`buildConsoleSnippet` in `WebTab.jsx`).
  Same injection logic as the existing bookmarklet, but delivered as
  plain, readable, multi-line JS meant for pasting into the browser
  console rather than a `javascript:` URI saved as a bookmark — the
  bookmarklet flow depends on a browser having an accessible
  add/drag-to-bookmark UI, which not every setup provides. Prints its own
  undo command (`document.body.classList.remove('gleetch-fx')`) on run.
  The bookmarklet itself is untouched, kept as a secondary option for
  setups where it still works.
- **Resizable sidebar** (`SidebarResizer.jsx`) — the effects sidebar was a
  fixed 280px regardless of window size. Now a real drag handle (mouse,
  touch, and keyboard arrow-key support), rendered once in the app shell
  rather than duplicated into all five tab components, driving a
  `--sidebar-width` CSS variable that every tab's `.sidebar` reads. Width
  persists across tab switches and reloads via localStorage.
  Desktop-only by design — on the mobile breakpoint `.sidebar` already
  goes to `width:100%` (stacked above `.main`, not beside it), so there's
  no horizontal split to drag; gave the mobile scroll panel more vertical
  room instead (`max-height` 260px → 320px) as the equivalent fix.
- **In-app help panel** (`HelpPanel.jsx`) — a modal, not a sixth tab
  (it's reference content to check mid-task, not a workspace with its
  own recipe/state). Covers all five media types, opens contextual to
  whichever tab is currently active. Reuses the scrollbar-visibility fix
  below rather than risk shipping a new scrollable region with the exact
  bug that was just found and fixed in `.algo-scroll`.
- **`DOT MOSAIC`** — grid-aligned, uniform-size circle-packed mosaic for
  image and video (`effects/image/stylize.js`). Complements the existing
  `HALFTONE`, which already covers brightness-driven dot radius — this
  fills the other half of that pair (flat/uniform dots) rather than
  duplicating it. Fully deterministic (no `rng`): dots sit on a fixed
  lattice derived only from width/height/cell size, never jittered, which
  is the actual point of it — an explicit alternative to a random-stipple
  approach that was tried and rejected first. Same performance class as
  `HALFTONE` (no `realtimeSafe: false` needed). See
  `tests/dot-mosaic.test.mjs`, including a regression test for a real bug
  caught during development: edge cells were centering dots using the
  nominal cell size instead of the actual clipped cell width/height,
  drifting right/bottom-edge dots past the canvas on any image whose
  dimensions aren't an exact multiple of the cell size (i.e. almost all of
  them).
- **Audio clean-tone parity closed.** Audio was the one media type still
  stuck with only a `corruption` category — no controlled/gentle
  counterpart the way `LENS ABERRATION` is to `CHANNEL DRIFT` for images.
  Added `WARM LOWPASS` (genuine one-pole filter, verified to actually
  attenuate high frequencies, not just "doesn't crash"), `SOFT COMPRESS`
  (a real envelope-follower dynamics compressor — different mechanism
  entirely from `OVERDRIVE`'s static waveshaping), `SUBTLE VIBRATO`
  (smooth interpolated pitch modulation, distinct from `TAPE WOBBLE`'s
  deliberately harsh nearest-neighbor lookup), `GENTLE FADE`.
- **Shareable recipe links.** Every tab's `⎘ COPY RECIPE LINK` encodes its
  current `{seed, effects, intensity}` into a URL that reproduces the
  exact same result for anyone who opens it — the app was always
  seed-deterministic, this just makes that reproducibility shareable
  instead of trapped in the UI. See `core/recipe.js` and DATA.md.
- **Active effect chain reordering.** Order genuinely changes output for
  chained effects; previously the only way to change it was deselecting
  and reselecting in the desired sequence. Every tab now shows an ACTIVE
  CHAIN list with ▲▼✕ controls.
- **Video: full-quality frame capture unlocks `OIL PAINT` and the
  `OVERLAY` effects.** These are genuinely too slow to run every frame
  during live 30fps playback, so continuous export still excludes them —
  but they're now selectable in the video effect panel and apply fully to
  `🎨 FULL QUALITY FRAME`, a single still capture with no real-time
  deadline to miss. Scoped deliberately: a full continuous full-quality
  video export (frame-sequence or ffmpeg.wasm) was considered and
  explicitly deferred rather than half-built — see APP_MAP.md's
  Architectural Decisions for the reasoning.
- **`sample-assets/`** — generated (ffmpeg test-pattern, not copyrighted)
  WAV and MP4 test fixtures, including one video with an audio track and
  one without, since the video/audio-separation pipeline had no
  human-verified real-world testing yet.
- **Governance docs adopted**: AGENT.md (engineering constitution),
  APP_MAP.md (architectural impact map, filled out for Gleetch's actual
  systems rather than left as a template), DESIGN.md (visual language,
  documented from the real CSS), DATA.md (honest — there's almost no data
  layer to govern), BUILD_CHECKLIST.md (completion checklist).

### Fixed
- **The active-effect-chain list had no height cap.** With only ASCII
  SHAPES as a param-aware effect, this never mattered in practice; now
  that 11 effects declare `params`, a chain with several of them active
  simultaneously could grow tall enough to squeeze `.algo-scroll`'s
  flex space on desktop — reported as "the effects list isn't
  scrollable anymore." Gave `.chain-list` the same bounded,
  independently-scrollable treatment `.algo-scroll` already uses
  (including the visible-scrollbar styling, since a near-identical
  "can't tell it scrolls" issue was already fixed there once before).

### Fixed
- **Recipe-loaded effect params were never validated against their own
  schema** — a color param interpolated straight into generated CSS
  (the `WEB` tab's new color-controllable effects) meant a crafted
  recipe URL could break out of the CSS value it was meant to fill and
  inject arbitrary rules into whatever page the resulting CSS gets
  applied to via the console-snippet/bookmarklet, not just the app's
  own preview. Found in a deep-scan pass, not reported. Fixed at the
  one chokepoint all three chain runners (`applyEffectChain`,
  `applyVideoEffectChain`, `buildWebCSS`) already shared: every param
  is now validated against its declared type/range/options and falls
  back to that field's own default if invalid — per field, so one bad
  value in a recipe doesn't wipe out the other, legitimate ones.
  Regression-tested (7 cases: the breakout payload itself, several
  malformed color shapes, out-of-range and non-numeric range values, an
  invalid select value, and confirming legitimate custom values still
  pass through untouched).
- **`npm audit` dependency vulnerabilities** (`brace-expansion`,
  `postcss` — both dev-tooling only, not runtime) — resolved via
  `npm audit fix`, non-breaking. 0 vulnerabilities now.

### Fixed
- **`captureFullQualityFrame` silently ignored any custom effect
  params** — a video with, say, `ASCII SHAPES`'s color customized would
  revert to the schema default the moment you captured a full-quality
  still, rather than keeping your actual choice. The same gap existed
  on the video tab's audio-track export path (`runExport` and
  `exportAudioOnly` weren't passing audio effect params through to
  `processAudioBuffer` either). Both fixed by threading `effectParams`
  through, the same pattern every other call site in the app already
  used. Found during this round's own wiring work rather than reported;
  regression-tested via `buildWebCSS`'s equivalent case.

### Fixed
- **Five issues found in a full audit pass** (test suite + lint + build,
  a fresh adversarial re-read of everything from this session, and a
  first real look at parts of the codebase not touched yet):
  - `HelpPanel`'s close button rendered the literal text `\u2715`
    instead of ✕ — verified via this project's actual JSX compiler
    output, not just eyeballed. A raw unicode escape in JSX children
    text doesn't get interpreted the way it would inside a real string;
    fixed by moving it into an actual expression, `{'\u2715'}`.
  - The console-snippet's printed "undo" only removed the `.gleetch-fx`
    class — the injected `<style id="gleetch-injected">` tag itself was
    never removed, and running the snippet twice added a second tag
    with the same id rather than replacing the first. Both
    `buildBookmarklet` and `buildConsoleSnippet` now remove any existing
    `#gleetch-injected` tag before adding a new one, and the printed
    undo command removes the tag, not just the class.
  - Visual tab's upload handler had no `if (!file) return` guard —
    Audio and Video both already had this as their first line. Canceling
    the file picker on Visual specifically threw an unhandled promise
    rejection (`URL.createObjectURL(undefined)`).
  - `SidebarResizer`'s `role="separator"` had no `aria-valuenow`/`min`/
    `max`, so a screen reader announced "separator" with no sense of
    current size. Now tracks width in React state alongside the CSS
    variable (updated at the end of a drag/keystroke, not continuously,
    avoiding extra re-renders on the hot drag path) and exposes all three.
  - None of the `localStorage` calls were wrapped in try/catch, despite
    `DATA.md` explicitly flagging this as the first thing in the
    codebase to touch browser storage. Some browser configurations
    (private browsing, strict privacy settings) throw on
    `getItem`/`setItem` rather than no-op. `DATA.md` also now documents
    this as a deliberate, considered exception to its own "no storage
    APIs" rule rather than leaving that rule looking silently violated.
- **Effects panel scroll was real but functionally invisible.** Reported
  as "can't scroll" on Windows specifically, which ruled out the
  mobile-Safari touch-scrolling theories checked first. Root cause:
  `.algo-scroll`'s scrollbar was 4px wide in `#2A2A55` against an
  `#18183A` background — about a 6-unit RGB delta per channel — with zero
  Firefox styling at all (`scrollbar-width`/`scrollbar-color` were never
  set, only the webkit-specific pseudo-elements). Technically scrollable,
  practically undiscoverable. Fixed with a 9px high-contrast scrollbar
  (webkit and Firefox both), a visible track, and an always-on fade at
  the bottom edge as a second signal independent of the scrollbar itself.
- **`IMPORT YOUR CSS` didn't actually reach the preview.** The feature
  existed and correctly included pasted CSS in every export (verified —
  never silently dropped), but the demo card and the textarea were
  strangers: the card only exposed `.web-demo-card`/`.web-demo-btn`, its
  own internal styling hooks, so arbitrary pasted CSS using a user's own
  class names had nothing to match. Gave the card stable, documented
  target classes (`.gleetch-demo`, `.gleetch-demo-heading`,
  `.gleetch-demo-btn`), updated the placeholder to demonstrate them, and
  added a hint line — nearly repeated the same near-invisible-text
  mistake here too (`.canvas-hint`'s color is calibrated for `.main`'s
  darker background, not `.sidebar`'s lighter one), caught before
  shipping, new `.sidebar-hint` class used instead.
- **A real BUILD_CHECKLIST audit pass caught two genuine gaps, not just
  confirmed compliance:**
  - The new active-chain ▲▼✕ buttons shipped with a 34px mobile touch
    target against the app's own established 44px minimum (every other
    interactive control follows this rule) — an oversight caught by
    checking the new CSS against DESIGN.md's own stated rule, not assumed
    compliant. Verified the fix actually fits (44px × 3 buttons still
    leaves ~180px for the effect name on a 375px-wide phone) before
    applying it, rather than shrinking the rule to fit the mistake.
  - **Four** copy-to-clipboard buttons (`COPY RECIPE LINK` — new this
    pass — plus three pre-existing ones: `COPY OUTPUT`, `<style>
    SNIPPET`, `BOOKMARKLET`) gave zero visual confirmation that the copy
    succeeded. Fixed with a shared `useCopyToClipboard` hook (brief
    "✓ COPIED" label flip) applied to all four, not just the new one.
- Stale documentation drift, again: README's effect counts/categories for
  AUDIO (12→16, missing `clean-tone`) and VIDEO (22→26, since
  `oilPaint`/`overlay*` are now video-selectable) were wrong the moment
  those effects widened; the total effect count (61→65) and an entire
  paragraph explaining video's old oilPaint/overlay exclusion were also
  stale. Also caught and fixed a duplicate `core/` heading introduced
  while patching the architecture tree — two sibling `core/` blocks under
  `src/` that read as two different folders.

### Fixed
- **Viewer was actually smaller than before, not bigger.** The earlier
  "make the viewer bigger" pass added `max-width`/`max-height` caps to
  `.canvas-wrap`, `.out-canvas`, and `.video-output` — but a cap alone
  never makes anything grow, it only prevents overflow. With no `width`
  driving it larger, the canvas just rendered at its native pixel
  resolution (e.g. 512×512, or a video's native size), which on most
  screens is a small fraction of the available viewer area. For video
  specifically this was a genuine regression: the CSS rule removed as
  "stale/conflicting" during that pass (`max-width:512px; width:100%`)
  was actually the one thing making it scale at all. Fixed by adding
  `width:100%` (capped at 1100px so it doesn't look silly on ultrawide
  monitors) with `height:auto` to preserve aspect ratio — the standard
  responsive-replaced-element pattern — while keeping `max-height` as a
  secondary safety cap for unusually tall content.
- Migrated ESLint 8 (flagged "no longer supported" on a fresh install,
  along with several deprecated transitive deps) to ESLint 9 with flat
  config (`eslint.config.js` replacing `.eslintrc.json`). Attempted
  ESLint 10 first since it's the actual latest, but `eslint-plugin-react`
  doesn't support it yet (peer dependency conflict) — pinned to the
  newest version the plugin ecosystem actually supports instead of
  forcing past the conflict with `--legacy-peer-deps`.
- The newer `eslint-plugin-react-hooks` (v4 → v7) ships a substantially
  stricter `recommended` rule set than what this project had been running
  against all along, and it caught three real issues on the first run
  under the new config:
  - `ScrambleText` and `VisualTab` were syncing derived state via
    `useEffect` + `setState` (`react-hooks/set-state-in-effect`) where the
    value could just be computed directly during render — fixed by
    removing the state+effect pair entirely in both cases (`VisualTab`'s
    `dims` is now a `useMemo`, `ScrambleText` renders `text` directly when
    inactive instead of syncing it into state).
  - `VideoTab`'s recursive `requestAnimationFrame(renderFrame)` call
    self-referenced the `renderFrame` const by name inside its own body
    (`react-hooks/immutability` — flagged as "accessed before declared").
    This works correctly at runtime (the callback only fires after the
    assignment completes) but doesn't hold up under static analysis. Fixed
    by routing the recursive call through a ref, populated in an effect
    rather than during render (an interim fix that wrote to the ref
    synchronously during render hit a *second* rule, `react-hooks/refs`,
    before landing on the correct effect-based version).
- Added `tests/edge-cases.test.mjs`: intensity boundaries (exactly 0 and
  1), tiny/odd image dimensions (1×1 through 5×1), empty/whitespace-only/
  single-character text, and zero-length audio buffers, across every
  effect. All passed on the first run — no bugs found, but formalized as a
  permanent regression test rather than a one-time manual check.
- Made `engines.node` in `package.json` precise (`^18.18.0 || ^20.9.0 ||
  >=21.1.0`, ESLint 9's actual minimum) instead of the vaguer `>=18` that
  was there before — a generic range that happens to work today doesn't
  document the real constraint.

## [3.0.0] — 2026-07-16

### Added
- **New tab: WEB.** Generates real CSS glitch effects (RGB split,
  scanlines, glitch-slice, datamosh jump, hue cycle, VHS wobble, invert
  pulse, noise static), previewed live against a demo card. Exports as a
  `.css` file, a `<style>` snippet, or a bookmarklet — the actual
  workaround for "glitch a live website," since browser security blocks
  loading an arbitrary cross-origin URL into this app and injecting into
  it directly. Also supports importing your own CSS to combine with the
  generated effects.
- **20 new patterns** (TEXTURE family: crumpled foil, rust patina, geode
  slice, canyon strata, moss growth, carbon fiber, oxidized silver, and
  more), bringing the pattern count to 120.
- **`PHANTOM FACE`** (image + video) — a procedurally-generated ghostly
  face blended into the image via pure per-pixel distance-field math, no
  offscreen canvas needed, cheap enough for real-time video.
- **Video: independent audio-track processing.** Uploading a video now
  also decodes its audio track and exposes a separate effect chain +
  intensity for it. Export as one combined file (video + audio muxed into
  a single MediaRecorder recording) or as two separate files.
- **New effects:** `ECHO` and `OUTBURST` (audio), `POSITION DISTORTION`
  (text — flips words upside-down, mirrors, slants, or droops them
  per-word), `FONT SHUFFLE` and the `clean-tone`/`typography` text
  categories, `MARGIN DRIFT` (text analog of `LENS ABERRATION`).
- **JPG export** alongside PNG for images.
- Mobile-responsive layout (stacked below 860px, 44px touch targets,
  scrollable tab bar, natural page scroll instead of nested scroll
  regions).
- Category-coded UI: button chrome hints at effect category (corruption
  flickers, clean-tone stays crisp, distortion skews, stylize cycles hue,
  overlay double-exposes, typography self-previews via real FONT SHUFFLE).
  Scramble-decode busy states. Rare idle glitch pulse on canvas frames.
- Full test suite (`tests/`, Node's built-in test runner, zero new
  dependencies) and CI/CD (GitHub Actions: lint + test + build on every
  push/PR, deploy to GitHub Pages on merge to main).
- Full OSS project scaffolding: LICENSE (MIT), CONTRIBUTING.md,
  CODE_OF_CONDUCT.md, SECURITY.md, issue/PR templates.

### Fixed
- **Core PRNG divisor bug** (inherited from v1): `prng()` divided by 2³¹
  instead of 2³², so 50% of every random draw across the entire app landed
  in `[1, 2)` instead of `[0, 1)`. This is a breaking change for
  reproducibility — no seed generated before this fix reproduces
  identically after it.
- **Effect-id collision**: `stutter` and `noiseInject` exist as both text
  and audio effects; lookup resolved to whichever came first in the
  registry regardless of caller, so the Audio tab's default selection and
  two of its four presets crashed immediately. Fixed by making effect
  lookup media-type-scoped instead of renaming ids.
- **Image export size bug**: uploaded images were force-cropped to a fixed
  512×512 square regardless of their real dimensions. Canvas now adapts to
  the source image's own aspect ratio (capped at 1024px on the longer edge
  for processing speed).
- **Video "style pick" flicker**: `duotone`, `hueRotate`, `lensWarp`,
  `lineDistortion`, and `phantomFace` pick a one-time style choice (hue,
  direction, position) via `rng()`; without the new `stableAcrossFrames`
  registry flag, video mode's per-frame-seeded rng re-rolled that choice
  every frame, causing flicker instead of a stable look for the clip.
- AudioContext / playing-audio / blob-URL leaks on tab switch (each tab
  fully unmounts on navigation; playing audio kept running with no way to
  stop it, and repeated Audio-tab visits would eventually exhaust the
  browser's AudioContext limit).
- A surrogate-pair indexing bug in `FONT SHUFFLE`: Mathematical
  Alphanumeric Symbols are outside the BMP (2 UTF-16 units each); raw
  string indexing sliced pairs in half, producing broken glyphs.

### Changed
- Effects list now scrolls independently from the rest of the sidebar.
- Canvas/video viewer sizes to the content's real aspect ratio instead of
  a small fixed box.
- `vite.config.js` now uses a relative `base` path for portability between
  root-served hosts (Netlify) and subpath-served hosts (GitHub Pages).

## [2.0.0] — undated

Full architectural rebuild from a single ~1,100-line monolithic component
into a modular effect-registry architecture (`core/`, `patterns/`,
`effects/<mediaType>/<category>.js`, `components/`), fixing significant
code duplication in the original file. Added four new effect categories
beyond the original corruption-only set (`color-tone`, `distortion`,
`stylize`, `overlay`), a shuffle button distinct from seed re-roll, and
real video-file export via MediaRecorder (previously video mode only
supported single-frame PNG capture).

## [1.0.0] — undated

Initial release. Single-file Vite + React app. Corruption/glitch effects
across image, text, audio, and video, plus 100 hidden generative patterns
picked automatically from the seed.
