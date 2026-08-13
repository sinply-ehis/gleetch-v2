# GLEETCH v3 — General Special-Effects Library

[![CI](https://github.com/sinply-ehis/Gleetch/actions/workflows/ci.yml/badge.svg)](https://github.com/sinply-ehis/Gleetch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg](./CONTRIBUTING.md)

> Badges above already point at the real repository (`sinply-ehis/Gleetch`).
> `package.json`'s `repository`/`bugs`/`homepage` fields carry the same
> value. If the repo ever moves, search-and-replace `sinply-ehis/Gleetch`.

Started as a corruption/glitch tool. Now a general effects library across
image, text, audio, video, and CSS/web — corruption is one category among
several (color/tone, distortion, stylization, generative overlay,
typography). 120 hidden generative patterns, 77 effects total, real
video-file export with independent audio-track processing, and a
CSS-generation engine for glitching live websites.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy

```bash
npm run build   # outputs to dist/
# drag dist/ into Netlify, or: vercel --prod
```

Or push to `main` on GitHub and let CI handle it — `.github/workflows/deploy.yml`
builds and deploys to GitHub Pages automatically (enable Pages under repo
Settings → Pages → Source: GitHub Actions, once). `vite.config.js` uses a
relative `base` path specifically so the same build works whether it's
served from a domain root (Netlify) or a subpath (GitHub Pages project
sites serve from `/reponame/`).

No new dependencies through v3 — video export and audio-track muxing use
the browser-native MediaRecorder and Web Audio APIs, so the zero-friction
deploy story is unchanged.

## What it does

| Tab | Input | Effects | Categories |
|-----|-------|---------|-----------|
| VISUAL | Image upload or 120 hidden generated patterns | 27 | corruption, color-tone, distortion, stylize, overlay |
| TEXT | Paste code, prose, poetry, source files | 15 | corruption, clean-tone, typography |
| AUDIO | Upload mp3/wav/ogg/flac/m4a, exports WAV | 16 | corruption, clean-tone |
| VIDEO | Upload mp4/webm/mov, real-time preview + real video export, audio track processed independently | 27 | corruption, color-tone, distortion, stylize, overlay |
| WEB | Generates real CSS, previewed live, exports as file/snippet/console/bookmarklet | 8 | corruption, color-tone, distortion, stylize |

`oilPaint` and the 3 `overlay*` effects are tagged `realtimeSafe: false` —
selectable in the video effect panel, but skipped during live preview and
continuous export (they're too slow to re-render every frame at 30fps).
They only actually apply via **🎨 FULL QUALITY FRAME** — a single still
capture, which has no real-time deadline to miss. `phantomFace` is the
exception among the visually-similar "overlay" effects: it's pure
per-pixel math with no pattern lookup, so it's cheap enough for real-time
video and runs live like everything else.

`clean-tone` on the text tab mirrors `color-tone` on images: systematic and
positional instead of chaotic. `MARGIN DRIFT` is the direct text analog of
`LENS ABERRATION` — clean in the middle of a line, increasingly fringed
toward the edges, same distance-squared falloff.

`typography` is a new category: `FONT SHUFFLE` assigns a randomly-picked
*real Unicode typeface* (bold, italic, sans-serif, monospace, double-struck,
fraktur, script, fullwidth — via the Mathematical Alphanumeric Symbols
block, U+1D400–1D7FF) to each word. These are genuine distinct code points,
not a CSS trick, so the output round-trips through copy-paste and plain-text
export anywhere.

### Video: style picks vs. per-frame glitch

Most video effects re-roll their randomness every frame on purpose — that's
what makes pixel sort, datamosh, and channel drift feel alive as the clip
plays. But a few effects use randomness to make a one-time *style* choice
rather than a per-frame *glitch* decision: `duotone`'s hue pair, `hueRotate`'s
direction, `lensWarp`'s bulge-vs-pinch, `lineDistortion`'s wave shape,
`phantomFace`'s position/size/color. Those
are flagged `stableAcrossFrames` in the registry and get a seed tied to the
clip instead of the frame — so the choice holds for the whole video instead
of flickering between random picks 30 times a second. Re-rolling the seed
(or hitting shuffle) still gives them a fresh pick; it's per-frame flicker
specifically that's fixed.

## Architecture

```
src/
  core/            — rng, color/math, canvas (incl. adaptive sizing),
                      WAV encoder, constants, recipe.js (encode/decode a
                      tab's {seed, algos, intensity, channel?} into a
                      shareable URL) — single source of truth
  patterns/        — 120 generative patterns across 7 family files
                      (mathematical, geometric, natural, signal, generative,
                      artistic, texture) + a central registry with family
                      tags. New patterns are checked programmatically
                      against the existing 100+ for id collisions before
                      being added — see patterns/registry.js history.
  effects/
    image/         — corruption.js, color-tone.js, distortion.js,
                      stylize.js, overlay.js (pattern-blend; oilPaint and
                      overlay* are tagged `realtimeSafe: false` — selectable
                      for video but only applied via full-quality frame
                      capture, not continuous playback), uncanny.js
                      (phantomFace — pure pixel math, real-time video-safe)
    text/          — corruption.js, clean-tone.js, typography.js
                      (FONT SHUFFLE), position.js (POSITION DISTORTION)
    audio/         — corruption.js, clean-tone.js (WARM LOWPASS, SOFT
                      COMPRESS, SUBTLE VIBRATO, GENTLE FADE), process-buffer.js
                      (shared chain-runner used by both AudioTab and
                      VideoTab's audio track)
    video/         — export.js (MediaRecorder export, optionally muxing a
                      processed audio track into the same file)
    web/           — glitch.js (CSS-generating effects — different call
                      shape from the others: (intensity, rng) => CSS, not
                      data transform)
    registry.js    — merges every effect into one queryable list, filterable
                      by mediaType + category; applyEffectChain() and
                      applyVideoEffectChain() run a chain of effect ids;
                      buildWebCSS() aggregates CSS-generating effects
    presets.js     — named preset chains per media type
  components/      — AlgoPanel (generic, reads the registry, applies
                      category-coded hover treatment), PresetPanel,
                      UploadZone, ShuffleButton, ScrambleText (busy-state
                      decode animation), ActiveChainList (drag-free
                      ▲▼✕ reordering of the active effect chain),
                      CopyRecipeButton, useCopyToClipboard (shared
                      copy-with-feedback hook), VideoAudioTrackPanel, one
                      file per tab, plus two video-specific hooks:
                        useVideoAudioTrack.js — extracts/decodes the audio
                          track from an uploaded video file
                        useVideoExport.js — export orchestration (combined,
                          video-only, audio-only)
  gleetch.jsx      — thin shell: tab routing + shared seed/reroll state
```

Every effect is one object: `{ id, label, hint, category, mediaTypes[], fn }`
(web effects add `fn` returning `{keyframes?, animation?, rules?}` instead
of transformed data). Adding a new effect means adding one function + one
registry entry — no new UI code, since `AlgoPanel` reads the registry
directly and groups/styles by category automatically.

## Keyboard & Controls

- `SPACE` — re-roll seed (same effects, new randomness)
- `🎲 SHUFFLE` (every tab) — randomizes which effects are active + intensity,
  distinct from re-roll
- `Ctrl/Cmd + V` — paste image directly (jumps to Visual tab from anywhere)
- Drag any image or video directly onto the canvas
- `?` (top right, every tab) — opens the in-app help panel, contextual to
  whichever tab you're on, covering all five media types
- Drag the thin divider between the sidebar and the preview to resize the
  sidebar — persists across tab switches and reloads (desktop only; the
  mobile layout stacks instead of splitting side-by-side, so there's
  nothing to drag there)
- Video tab: exports as combined video+audio, video-only, or audio-only,
  depending on what's loaded
- Web tab: exports as `.css` file, `<style>` snippet, a DevTools console
  snippet, or a bookmarklet (legacy) — the console snippet and
  bookmarklet both glitch any live site you're viewing, not just your own
- Every tab: `⎘ COPY RECIPE LINK` copies a shareable URL that reproduces
  the exact same effects + intensity + seed for anyone who opens it
- Every tab with active effects: an **ACTIVE CHAIN** list appears with
  ▲▼✕ controls — drag-free reordering, since chained effects genuinely
  produce different output depending on execution order
- Video tab: `🎨 FULL QUALITY FRAME` captures the current frame using the
  complete active effect set, including `OIL PAINT` and the `OVERLAY`
  effects — these are too slow to run every frame during live playback
  (tagged `realtimeSafe: false`), so they're skipped there and only apply
  to this one-off still capture, which has no 30fps deadline to miss

## Recipe Sharing

Every tab's output is already fully determined by `{seed, active effects,
intensity}` — that's the whole point of the seed-based architecture. The
recipe link just makes that reproducibility shareable instead of trapped
in the UI: click `⎘ COPY RECIPE LINK`, send the URL to anyone, and opening
it reproduces your exact result — same tab, same seed, same effect chain,
same intensity. It does *not* encode whatever image/audio/video you
uploaded — only the recipe applied to whatever the recipient loads
themselves, which is the actually-shareable part.

## Mobile

Built to be used from a phone, not just resized down from desktop — this
matters in practice since most real audio/video source material comes off
a phone, not a desktop file browser. Below an 860px viewport:

- Layout stacks vertically instead of side-by-side. Upload/controls come
  first (matches an upload-first workflow — the upload button is visible
  without scrolling), the preview follows below.
- The whole page scrolls naturally as one unit — no nested independent-
  scroll-region trickery, which fights touch/momentum scrolling on mobile
  more than it helps. (Desktop keeps the independent-scroll sidebar/viewer
  behavior; that's a deliberate difference, not an oversight.)
- Every interactive control — buttons, preset chips, slider thumbs — meets
  or exceeds a 44px touch target, the standard comfortable minimum.
- The tab bar becomes horizontally scrollable so all 5 tabs stay reachable
  without wrapping awkwardly on narrow screens.
- Slider styling now has both `-webkit-` and `-moz-` thumb rules — the
  `-moz-` one was missing before, meaning Firefox on Android would've
  fallen back to an unstyled default slider. Chrome/Safari mobile (the
  large majority of mobile traffic) were unaffected either way.

File upload uses a plain `<input type="file">` under the hood, so it
already gets the native photo/file/camera picker on mobile for free — no
special-casing needed there.

## UI as demonstration, not just decoration

The glitch personality used to live almost entirely in the logo (idle
flicker + reroll burst) and a static CRT scanline overlay on the canvas —
the actual controls were a conventional dark-mode UI. Now the chrome itself
hints at what each category does, event-driven only (hover/click/load —
never ambient, so the controls stay stable and legible at rest):

- **corruption** buttons flicker with a brief RGB-split on hover
- **clean-tone** buttons stay deliberately crisp — a steady cyan inset
  border, no motion, the contrast with corruption *is* the point
- **distortion** buttons skew slightly on hover
- **stylize** buttons cycle their border hue on hover
- **overlay** buttons get a soft double-exposure text-shadow
- **typography** buttons preview themselves — the label is run through the
  real FONT SHUFFLE effect, seeded from the label text so it's stable
  rather than reflowing every render
- Busy states (rendering / processing / exporting) scramble-decode into the
  real word instead of just blinking
- Canvas frames get a rare (~14s), brief RGB-split pulse when idle — same
  restrained pattern as the logo, extended to the "screen" layer only,
  never to the instrument layer you're actively using

## License

Do whatever. It is 𝔊𝔏𝔈𝔈𝔗ℭℌ.

*(that's real output from `fontShuffle('GLEETCH', 0.9, prng(26))` — Mathematical
Fraktur, not hand-typed — because a glitch tool's license line should
probably be glitched by the glitch tool itself.)*

MIT — see [LICENSE](./LICENSE).

## More

- **[AGENT.md](./AGENT.md)** — the engineering constitution this project
  follows: how decisions get made, what "done" means, required standards
  across architecture, UX, error handling, performance, and documentation
- **[APP_MAP.md](./APP_MAP.md)** — the architectural impact map: what
  depends on what, what to review when a shared system changes, critical
  data flows, and open/deferred decisions
- **[DESIGN.md](./DESIGN.md)** — the actual visual language (colors, type,
  motion rules, layout), pulled from the real CSS, not aspirational
- **[DATA.md](./DATA.md)** — what persists (almost nothing) and how the
  one exception (shareable recipe links) is designed to fail safe
- **[docs/using-the-web-tab.md](./docs/using-the-web-tab.md)** — step by
  step guide to all four WEB tab export options, including how to
  actually apply the effect to a real site you don't own
- **[sample-assets/](./sample-assets/)** — generated (not copyrighted)
  test audio/video files, useful if you don't have your own handy for
  testing the Audio and Video tabs
- **[CHANGELOG.md](./CHANGELOG.md)** — version history, including every
  bug found and fixed along the way (worth reading if you're curious what
  broke and why, not just what shipped)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — dev setup, the actual
  conventions this codebase follows, and how to add a new effect in two
  steps
- **[BUILD_CHECKLIST.md](./BUILD_CHECKLIST.md)** — the completion
  checklist every meaningful change should be reviewed against before
  being called done
- **[SECURITY.md](./SECURITY.md)** — the honest threat model for a
  100%-client-side app
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**
