# Using the WEB Tab — Glitching Real Websites with Gleetch

The WEB tab generates real CSS glitch effects and lets you apply them two
ways: preview them live in a demo card inside the app, or export them and
use them on an actual website — including sites you don't own or control,
via a bookmarklet.

## 1. Preview live in-app

Open the **WEB** tab. You'll see a demo card ("Signal Corrupted") in the
main panel — that's a live preview, not a screenshot. Any effect you
toggle updates it instantly.

- **PRESETS** — four ready-made combinations (`RETRO CRT`, `SIGNAL LOSS`,
  `TRIPPY`, `HAUNTED`). Click one to apply it immediately.
- **EFFECTS** — click to expand the full list (14 effects: RGB split, hue
  cycle, scanlines, noise static, glitch slice, datamosh jump, VHS wobble,
  invert pulse, overlay screen, overlay multiply, overlay blend, particle
  drift, neon glow, film grain). Click any effect to toggle it on/off — you
  can combine several at once.
- Effects with their own extra controls (a color swatch, a slider) show
  them right under their entry in **ACTIVE** once toggled on — for example,
  NEON GLOW's color and glow strength, or PARTICLE DRIFT's particle count
  and speed. Effects without any of their own tunables just use INTENSITY.
- **INTENSITY slider** — controls how strong the active effects are.
- **RE-ROLL** — same effects, new randomness (a fresh seed).
- **SHUFFLE** — picks a new random combination of effects and intensity
  for you, if you just want to see what's possible.

Play with this until the demo card looks like something you'd actually
want on a real page.

## 2. Get it onto a real website

Once you like what you see, scroll down to the four export buttons.

### Option A — DevTools console (glitch *any* site you're viewing)

This is the one that lets you glitch a website you don't have the code
for — your bank's site, a friend's blog, whatever's open in your browser
right now. It's the recommended way to do this now; see Option B below
for why.

1. Click **⎘ DEV CONSOLE**. This copies a small script to your clipboard.
2. Open DevTools on the site you want to glitch: right-click anywhere on
   the page → **Inspect**, or press **F12** (Windows/Linux) /
   **Cmd+Option+I** (Mac). Click the **Console** tab if it's not already
   showing.
3. Click into the console, paste (`Ctrl+V` / `Cmd+V`), and press **Enter**.
4. The glitch effect applies immediately to that live page.

The console prints its own undo command when it runs — copy that line
back into the console and press Enter to remove the effect. Reloading
the page also removes it (nothing persists or gets saved to the site).
It only affects your own browser view — nobody else sees it, and nothing
is uploaded or changed on the actual site.

> Why DevTools at all, instead of just typing a URL into Gleetch?
> Browsers deliberately block a webpage (Gleetch) from reaching into a
> *different* website's page and modifying it directly — that's a
> security boundary, not a Gleetch limitation. Pasting into the console
> sidesteps this cleanly: it runs in the context of whatever page you're
> already on, because *you* triggered it from your own browser, not
> because Gleetch reached out to that site.

### Option B — the bookmarklet (legacy)

Same job as Option A, older method. **⎘ BOOKMARKLET** copies a
`javascript:` link that you'd normally save as a browser bookmark, then
click whenever you want to trigger it. It's kept around for setups where
that still works, but a lot of browsers now block pasting a
`javascript:` link directly into the address bar (an anti-phishing
measure), and there's often no convenient way to add one at all on
mobile — which is exactly why Option A exists. If dragging a link to your
bookmarks bar still works fine for you, this does the same thing; if it
doesn't, use the console instead.

### Option C — a `.css` file

Click **↓ CSS FILE** to download the generated CSS as a real `.css` file.
Use this if you're building your own website and want to add the glitch
effect to it permanently. You'll need to:
1. Add the downloaded CSS file to your project.
2. Add the class `gleetch-fx` to whatever HTML element you want glitched.

### Option D — a copy-paste snippet

Click **⎘ &lt;style&gt; SNIPPET** to copy a ready-to-paste block (includes
the `<style>` tags already). Good for quickly dropping into an HTML file,
a CodePen, a CMS that lets you add custom CSS, etc. Same rule applies —
put the class `gleetch-fx` on the element you want affected.

Whichever export you use, the CSS itself only ever contains the effects
you picked — it never includes any of Gleetch's own demo/UI styling, so
it won't change your colors, fonts, or layout beyond what the effect
itself does.

## 3. Bring your own CSS (optional)

Expand **▶ IMPORT YOUR CSS** in the sidebar and paste in a few rules —
this restyles the demo card itself, so you can see your own look with
the glitch layered on top of it, not just Gleetch's default dark card.
Target these classes:

- `.gleetch-demo` — the card itself (background, border, blur, etc.)
- `.gleetch-demo-heading` — the heading text
- `.gleetch-demo-btn` — the button

For example, a glassmorphism look:

```css
.gleetch-demo {
  background: rgba(255, 255, 255, .08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, .15);
  border-radius: 16px;
}
```

Whatever you paste here is also included in every export alongside the
generated glitch CSS, so the same restyling travels with it.

## One honest limitation worth knowing

If you turn on two effects that both change the *same* visual property
(for example, two of the color-shifting effects), only one of them will
visibly "win" where they overlap — that's just how CSS works when two
rules target the same thing, not a bug. Effects that animate *different*
properties (say, a scanline overlay plus a wobble) layer together fine and
you'll see both at once.
