# Pareidolia Effects Round — Build Plan

Working plan for this round, agreed with Ehis in chat. Re-read this if
context is lost mid-build — it's the source of truth for scope and
decisions. Update the checkboxes as tasks complete.

## Context

- Ehis pointed at `C:\Users\ehis\Downloads\pareidolia_chaos_math_glitch_engine.html`
  as the reference for what PHANTOM FACE should actually be: a
  per-pixel *displacement* engine (eye-orbit traps + mouth-slit field,
  wave topologies, chromatic dispersion, color remaps, quantization) —
  not the current flat additive glow.
- "Add the other effects that are there as well and make them this
  dynamic as well using methods presented in the app already, let's not
  go overboard." So: port the engine, expose the reference's four
  presets as four effects plus its Color Math section as one more, all
  through the registry's existing `params` architecture. No new
  plumbing, no new dependencies.
- Also: fix the sidebar scroll bug (the WHOLE sidebar section can't
  scroll when its content exceeds the viewport — only the effects
  picker scrolls today), and make adding future effects even easier.
- Scope guard: no canvas-drag target repositioning, no time-flux
  toggle, no new categories — the reference's drag/center/flux-loop
  niceties are deliberately out of scope. Seeded time-phase gives
  "dynamic" for free via re-roll, and the app's frameSeed gives it for
  video via the established full-quality-frame path.

## Enforcement audit (plans vs. code — done first, before any edits)

Verified in code, all already enforced (no fixes needed):
- PLAN.md tasks 1–6: console snippet (+ undo), demo-card restyle,
  visible scrollbars on `.algo-scroll`, resizable sidebar (mobile
  judgment call documented, `[~]` as shipped), in-app help modal,
  export-scope verification. All present.
- PLAN_EFFECT_PARAMS.md issues 1–5: localStorage try/catch
  (`SidebarResizer.jsx`), HelpPanel `{'\u2715'}` JSX expression,
  `#gleetch-injected` replace-on-rerun + undo text, Visual tab upload
  guard, `aria-valuenow/min/max` on the resizer. All present.
- Registry params architecture (`params` schema, `sanitizeParams`,
  `getDefaultParams`, `showWhen`, recipe `p` field) fully enforced —
  verified by the 88/88 passing suite before this round.

## Tasks

### 1. Sidebar scroll bug (whole section, not just the effects picker)
- [ ] `.sidebar` is `overflow:hidden` + flex column; only `.algo-scroll`
      scrolls. When upload zone + presets + active chain + intensity +
      seed + action buttons exceed the viewport, content is clipped with
      no way to scroll to it — that's the reported bug.
- [ ] Fix in `src/index.css` only: `.sidebar` becomes
      `overflow-y:auto` with the same visible high-contrast scrollbar
      treatment as `.algo-scroll`; direct children (except
      `.algo-scroll`) get `flex-shrink:0` so controls never get
      squeezed; `.algo-scroll` gets `max-height:46vh` so the effects
      list keeps its own inner scroll while the sidebar itself can
      scroll as a whole when needed. Mobile (≤860px) unchanged — the
      page already scrolls as one unit there.

### 2. Pareidolia engine (`src/effects/image/pareidolia.js`, new)
- [ ] Shared per-pixel displacement core ported from the reference:
      normalized coords → mirror/dx → dual eye orbit traps + mouth slit
      (min of the two, squared-distance shortcut) → `field^-power`
      tension → `1/(1+(dx²+dy²)*4)` envelope → wave topology ×
      tension × chaos × intensity = displacement vector → per-channel
      chromatic dispersion → sampled source pixels → optional color
      remap + quantization → output.
- [ ] Five topologies (the reference's `param-algo` set): `sin_r`,
      `mod_chaos` (bitwise xor), `tangent_spike`, `polar_spiral`,
      `fractal_sin`. `atan2` only computed for the two that need it.
- [ ] Five color remaps (the reference's `param-colorMode` set):
      `monochrome`, `cyberTint`, `thermal`, `solarize`, `sineGradient`
      (+ `none`).
- [ ] Deterministic "time" phase + wave frequency drawn from the seeded
      rng (first two draws) — the app's own idiom for one-time style
      choices, so output varies with seed/re-roll with zero new
      plumbing, and never uses `Math.random()`.
- [ ] `intensity` scales displacement only; params carry the style
      (matches the app's "intensity = how much, params = what kind"
      split, and gives exact identity at zero-glitch params — a real
      testable property).
- [ ] Face geometry (scale/eyeDist/mouthY/mirror) baked per effect from
      the reference's four presets — deliberately not user params this
      round (scope guard).

### 3. Effect entries (`src/effects/image/uncanny.js` — rewrite)
- [ ] `phantomFace` — REWRITTEN, id/label/mediaTypes unchanged so
      presets (`HAUNTED`) and old recipe links keep working. GHOSTLY
      FACE defaults: sin_r, power 1.8, chaos 40, dispersion 12, none.
      Category `overlay` → `distortion` (it now genuinely warps).
- [ ] `modularMask` — ALIEN defaults: fractal_sin, 3.2 / 90 / 25,
      cyberTint, mirror on.
- [ ] `anomalousSpasm` — SPASM defaults: tangent_spike, 4.0 / 180 / 40,
      solarize, mirror off.
- [ ] `screamVortex` — VORTEX defaults: polar_spiral, 2.5 / 120 / 15,
      thermal, mirror off.
- [ ] All four share the one engine fn via a `faceParams(name)`
      factory (exact VORONOI/CRYSTALLIZE precedent) — same params
      schema, different per-effect defaults.
- [ ] Params (6): algo select, power range 0.5–4.5, chaos range 0–200,
      dispersion range 0–40, colorMode select, levels range 2–64
      (64 = unlimited).
- [ ] All four `realtimeSafe: false` — same performance band as
      VORONOI/CRYSTALLIZE (measured 22–40ms @512² there; this engine is
      comparable), consistent with the app's own bar. Selectable on
      video, applied via 🎨 FULL QUALITY FRAME. Flagged in CHANGELOG as
      "flip to true if real-browser measurement proves otherwise" —
      one-line change, noted so it isn't forgotten.
- [ ] `stableAcrossFrames` removed from phantomFace (it no longer runs
      in `applyVideoEffectChain` at all); APP_MAP's stableAcrossFrames
      regression list updated accordingly.

### 4. Color Math effect (`src/effects/image/color-tone.js`)
- [ ] `matrixColor` — the reference's Color Math section as a standalone
      effect: colorMode select (same 5 + none) + levels quantization.
      No displacement — cheap, `realtimeSafe: true`.
- [ ] Shared `applyColorRemap(mode, r, g, b, luma, time)` exported from
      color-tone.js, imported by pareidolia.js — one implementation,
      two consumers.

### 5. Tests (`tests/pareidolia-effects.test.mjs`, new)
- [ ] Registration: all 5 ids for image+video, params schemas present,
      four face effects share one fn, realtimeSafe flags correct
      (matrixColor true, face family false), phantomFace id still
      resolves (preset/recipe compat).
- [ ] Determinism: same seed + params → identical output; different
      seed → different output (the "dynamic" claim).
- [ ] Identity: chaos 0 + dispersion 0 + colorMode none + levels 64 →
      output exactly equals input.
- [ ] matrixColor: known cyberTint mapping on a solid gray buffer;
      levels quantization caps unique channel values; 'none' = untouched.
- [ ] Boundary runs: intensity 0 and 1, 1×1 buffer, missing/partial
      params (defaults path) — no NaN, no throw, correct length.
- [ ] Video chain: `applyVideoEffectChain` skips the face family and
      runs matrixColor.

### 6. Adding-effects ergonomics (`CONTRIBUTING.md`)
- [ ] Expand "Adding a new effect" with a copy-paste skeleton covering:
      params schema, shared-impl factory pattern, realtimeSafe
      guidance, category CSS rule requirement (DESIGN.md pointer), and
      registry registration for new files.
- [ ] Note: existing-category entries in an existing file need ZERO
      registry edits — this round's five effects are proof.

### 7. Docs
- [ ] CHANGELOG.md [Unreleased]: Added (5 effects + engine + scroll
      fix), Changed (phantomFace rewrite, realtimeSafe flags), plus the
      real-browser measurement caveat.
- [ ] APP_MAP.md: Effects Engine responsible-components + regression
      checklist (phantomFace leaves the stableAcrossFrames list),
      README cross-refs.
- [ ] README.md: effect counts recomputed from the registry
      (77 → 82; VISUAL 27 → 32, VIDEO 27 → 32), rewrite the
      "phantomFace is the real-time exception" paragraph (no longer
      true), update the "style picks" list and the architecture tree.
- [ ] This plan doc's checkboxes ticked; BUILD_CHECKLIST.md sections
      reviewed (existing-project convention: only affected sections).

## Out of scope (explicit, so nobody re-adds them accidentally)

- Canvas drag-to-reposition the face target (reference's targetX/Y)
- Continuous flux-loop toggle / time animation switch
- New categories or new CSS treatments (reusing `distortion` +
  `color-tone` keeps DESIGN.md's category table complete as-is)
- Any changes to Text/Audio/Web tabs or the landing page (next session)
