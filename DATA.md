# DATA.md
# Gleetch — Data Architecture & Lifecycle

## The honest short version

Gleetch has no database, no persistent storage, and no synchronization.
Every piece of state lives in React component state (in memory) and is
gone on page refresh, by design. There is exactly one exception, covered
below. This document is short because the actual data surface is small —
padding it out with sections for systems that don't exist would misstate
what this app does.

## What actually persists (and how)

**Nothing persists across sessions except what the user explicitly puts in
a URL.** The Recipe Sharing system (`core/recipe.js`, see APP_MAP.md)
encodes a tab's `{seed, algos, intensity, channel?}` into a URL query
parameter. That's the entire "data" story:

- **Format:** terse JSON, URL-safe base64. Not a binary format, not a
  database row, not versioned — see "Migrations" below for why that's a
  deliberate near-term choice, not an oversight.
- **Validation:** `decodeRecipe` checks for the required shape (`t` a
  truthy string, `s` a number, `a` an array) before accepting it, and
  returns `null` on anything else — including valid base64/JSON that just
  doesn't match the shape. It never throws on bad input.
- **Lifecycle:** read once on app mount (`getRecipeFromURL`), applied to
  the relevant tab's initial state, then the URL param is stripped
  (`clearRecipeFromURL`) so a reload or re-share of the page doesn't
  re-apply a stale recipe.
- **What it does NOT encode:** uploaded content (images, audio, video
  files) — only the effect recipe applied to whatever the recipient loads
  themselves. Encoding actual media into a URL isn't reasonable at any
  real file size, and isn't the useful part to share anyway (the
  *technique*, not the *source file*, is what's reproducible and worth
  sharing).

## Import / Export compatibility

Every export (PNG, JPG, WAV, WebM video, `.css` file) is a standard file
format read by ordinary tools outside Gleetch — there's no proprietary
project-file format to keep backward-compatible. The recipe URL is the one
Gleetch-specific format, and it's designed to fail safe (see above) rather
than require a migration path if the shape ever needs to change.

## Migrations

None exist yet because there's nothing versioned to migrate. If the recipe
shape changes in the future (e.g. adding a field), old encoded URLs will
still decode successfully (missing fields just come back `undefined`,
picked up by each tab's `initialRecipe?.field ?? default` pattern) as long
as no *existing* field's meaning changes. A genuinely breaking recipe-shape
change would need a version marker added to the payload at that time —
there isn't one today because it hasn't been needed yet, not because it
was overlooked.

## Caching

One deliberate exception as of the sidebar resizer: `SidebarResizer.jsx`
persists the chosen width via `localStorage` (key `gleetch-sidebar-width`,
just an integer, wrapped in try/catch since it's the first thing in this
codebase to touch browser storage — see the module comment there). This
was a conscious call to relax the general rule below for one small,
clearly-scoped, purely-cosmetic UI preference, not an oversight; if
storage is unavailable or throws, the resizer still works for the
session, it just won't be remembered next visit.

Everything else: no service worker, no other use of `localStorage`/
`sessionStorage` (deliberately — browser storage APIs don't work inside
artifact/sandboxed contexts this project has been developed alongside,
so the habit of avoiding them was kept even for the real deployed app,
where it's a smaller concern but still consistent with "everything lives
in memory, nothing persists").

## Offline / Online state

Not applicable in the traditional sense — see SECURITY.md's threat model
section. There is no network dependency at runtime beyond the initial
page load (static assets) and the Google Fonts CSS import in
`index.css`. The app does not detect or react to connectivity changes
because nothing it does requires a live connection once loaded.
