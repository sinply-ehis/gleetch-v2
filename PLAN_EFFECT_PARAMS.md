# Effect Custom Parameters — Architecture Plan

Second working plan in this project (see PLAN.md for the completed
website-integration round). Re-read this if context is lost mid-build.

## Context

- Wants real, user-controlled color for a new circle/density effect —
  not sampled from the photo like DOT MOSAIC/HALFTONE. Explicitly wants
  this built as reusable architecture, not a one-off: "it's inevitable
  if it changes from noise and corruption to special effects."
- Video color-cycling is ALREADY solved with zero new architecture: the
  video pipeline's `frameSeed` is time-derived
  (`seedRef.current + currentTime_ms`, see `VideoTab.jsx`), so any
  effect that picks color via `rng()` and isn't `stableAcrossFrames`
  naturally shifts as the video plays. Just needs correct effect design,
  not new plumbing.
- Every one of the 66 existing effects is `[intensity + seed] →
  output` with zero custom controls. This is the first effect that
  needs more than that. Keep the addition minimal and fully backward
  compatible — the other 65 effects must be completely unaffected.

## Architecture — 5 pieces

1. **Registry**: optional `params` array on a registry entry (e.g.
   `{key:'colorMode', type:'select', options:[...]}`,
   `{key:'color', type:'color'}`). Effects without `params` are
   untouched.
2. **Effect fn signature**: optional trailing `params` argument —
   `fn(buf, W, H, intensity, rng, params)`. Existing effects never
   declare it, so nothing changes for them.
3. **New small generic component** to render controls for whichever
   active effect declares `params` — driven by the schema, not
   hardcoded to this one effect, so it's ready for whatever comes next.
4. **Recipe/URL encoding** extended to carry param values, so a shared
   link with a custom color reproduces exactly for whoever opens it —
   same fail-safe standard `decodeRecipe` already holds itself to.
5. **The new effect** — circle/luminance-density technique, same family
   as HALFTONE/DOT MOSAIC (same cell-size-from-intensity formula).
   Skips near-white cells entirely (true ASCII-style blank space,
   unlike the other two which always draw something). `colorMode`:
   `single` (the picked color, every shape), `palette` (cycles a small
   built-in palette via `rng()`), `random` (random hue per shape via
   `rng()`). Not `stableAcrossFrames`, so video gets the color-cycling
   from point 2 above for free.

## Previous issues — still pending, not forgotten

1. Keep `localStorage` (decided) — but still needs try/catch around
   every call (nothing wraps it right now), and `DATA.md` needs
   updating to document this as a deliberate, stated exception to its
   own "no storage APIs" principle rather than leaving that principle
   looking violated/stale.
2. `HelpPanel`'s close button renders the literal text `\u2715` instead
   of ✕ — verified via this project's actual JSX compiler output, not
   just eyeballed. A raw escape sequence sitting in JSX children text
   doesn't get interpreted the way it would inside a real string.
3. Console-snippet's printed "undo" only removes the `.gleetch-fx`
   class — the injected `<style id="gleetch-injected">` tag itself is
   never removed, and running the snippet again adds *another* tag
   with the same id rather than replacing it. The older bookmarklet has
   the identical gap (no id, no undo at all) and always has.
4. Visual tab's upload handler has no `if (!file) return` guard —
   Audio and Video tabs both already have this as their first line.
   Canceling the file picker on Visual specifically throws an unhandled
   promise rejection.
5. `SidebarResizer`'s `role="separator"` has no `aria-valuenow` /
   `aria-valuemin` / `aria-valuemax`, so a screen reader announces
   "separator" with no sense of its current size.

## Status

- [x] Plan written
- [x] Bug fixes (5 items above)
- [x] Registry schema extension (`params` field, `getDefaultParams`,
      both `applyEffectChain`/`applyVideoEffectChain` pass params through
      — fully backward compatible, verified against all 66 pre-existing
      effects, none broke)
- [x] New generic param-control component (`ActiveChainList.jsx` now
      renders controls for any effect that declares `params` — select
      dropdown, native color input, `showWhen` conditional visibility.
      Wired into VisualTab and VideoTab, the two tabs with a param-aware
      effect today. Deliberately NOT wired into Text/Audio/Web yet —
      none of their effects declare `params`, so it'd be inert state;
      adding it to a tab is a small, well-scoped step once that tab
      actually has a param-aware effect, same pattern as this one)
- [x] Recipe encoding extension (`p` field, `encodeRecipe`/`decodeRecipe`
      needed zero changes — already fully generic — verified with tests,
      not just assumed. Old recipe links without `p` still decode fine)
- [x] New effect implementation (`asciiShapes`) — found and fixed a real
      bug via its own test suite: the "skip near-white cells" logic was
      checking the derived radius against a fixed threshold, but radius
      is floored at `minR` (which scales with cell size/intensity), so
      at most intensity settings a dot got drawn even for pure white
      input, silently defeating the whole point of that behavior. Fixed
      to check luminance directly instead.
- [x] Tests (11 dedicated: 6 for the effect itself, 3 for recipe
      round-tripping the new field, plus strengthened the registry-wiring
      test to verify changing a param through the real applyEffectChain
      call path actually changes output, not just that it runs)
- [x] Docs/changelog entry

## All items complete — see CHANGELOG.md [Unreleased] for the full writeup.
