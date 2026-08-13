# Current Build Plan — Website Integration + App Fixes

Working plan for an active multi-part initiative, agreed with Ehis in chat.
Re-read this if context is lost mid-build — it's the source of truth for
scope and decisions, not just a summary. Update the checkboxes as tasks
complete.

## Context

- The web-integration goal is applying gleetch LIVE to a site you DON'T
  own (e.g. Claude.ai) as a pure CSS visual overlay — text and links must
  keep working, nothing breaks. The "dev exports CSS to ship to their own
  site" path already works and needs no more work.
- Bookmarklets don't work in the browsers Ehis actually uses (no
  add/drag/paste-to-bookmark flow available) — keep the bookmarklet
  wherever it does still work for others, but it's not the primary path
  going forward.
- A browser extension was explicitly considered and rejected (store
  deployment cost/hassle for a problem that doesn't need it).

## Tasks

### 1. DevTools console-snippet (new primary "apply to any site" method)
- [x] `buildConsoleSnippet(css)` — same idea as `buildBookmarklet`, but
      plain, readable, multi-line JS meant for pasting into the browser
      console, not a `javascript:` URI
- [x] Include a line telling the user how to undo it
      (`document.body.classList.remove('gleetch-fx')`)
- [x] New export button in WebTab.jsx, alongside CSS FILE / <style>
      SNIPPET / BOOKMARKLET
- [x] Update `canvas-hint` copy to explain both options clearly
- [x] Bookmarklet code stays untouched — do not remove or modify it
- [x] Document how to use it (`docs/using-the-web-tab.md` rewritten,
      README cross-references updated)

### 2. Import-CSS restyles the demo card directly
- [x] Give the demo card stable, documented class names (e.g.
      `.gleetch-demo`, `.gleetch-demo h2`, `.gleetch-demo .btn`)
- [x] Update the import textarea's placeholder/hint to tell the user
      exactly what to target
- [x] "Replace" = swap the demo's style/color — the demo element itself
      stays visible as the canvas, never fully removed
- [x] Confirmed already correct, no change needed: CSS export only ever
      contains the chosen effects, never Gleetch's own demo styling

### 3. Visible scroll indicator on the effects panel
- [x] Bug reported on Windows specifically — not a mobile-Safari
      touch-scrolling issue, ruled that theory out
- [x] Root cause theory: `.algo-scroll` gets squeezed short by other
      sidebar content, and its 4px low-contrast scrollbar is nearly
      invisible even where it IS scrolling — reads as "can't scroll"
- [x] Fix: much thicker/higher-contrast scrollbar (webkit + Firefox via
      scrollbar-width/color) + an always-on bottom-edge fade
- [x] Works across all device types (pure CSS, no browser-specific gating)

### 4. Resizable/expandable sidebar
- [x] Currently fixed 280px (`.sidebar` in index.css) regardless of
      window size, while the main preview area often has unused space
- [x] Built as a real drag handle (`SidebarResizer.jsx`), rendered once
      in the app shell so the width persists across tab switches +
      reloads (localStorage), not duplicated into all 5 tab files
- [x] Mouse + touch + keyboard (arrow keys) drag support
- [~] Desktop: full drag-resize. Mobile: hidden (sidebar goes to
      width:100%, stacked layout, nothing to drag) — instead bumped the
      mobile scroll panel's max-height 260px → 320px for more room.
      Flagging this as a judgment call, not silently assumed — a literal
      drag-resize doesn't map onto the stacked mobile layout the same
      way, happy to revisit if that's not what was meant by "all device
      types"

### 5. In-app help/info section
- [x] Documents how to use every tab: visual, text, audio, video, web
- [x] Covers the new console-snippet method from task 1
- [x] Modal (not a 6th tab), opens contextual to whichever tab is active
- [x] Reused the task 3 scrollbar fix so it didn't ship with the same bug

## All 6 tasks complete — see CHANGELOG.md [Unreleased] for the full
## writeup, docs/using-the-web-tab.md for the rewritten WEB tab guide.

### 6. Export scope
- [x] Done — no work needed. Verified via `buildWebCSS` + index.css:
      exports already contain only the chosen effects, never any of
      Gleetch's own demo styling.

## Already done (earlier session, see CHANGELOG.md)
- `dotMosaic` effect shipped for image + video, tested, codebase
  deep-scanned for pre-existing bugs (none found)
