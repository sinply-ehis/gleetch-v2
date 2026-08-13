# Security Policy

## Threat model, honestly

Gleetch is a 100% client-side static web app. There is no backend, no
server, no database, no user accounts, and no data collection — every
effect (image, text, audio, video, CSS) runs entirely in your browser.
Nothing you upload or generate ever leaves your machine. This genuinely
limits the attack surface compared to most web apps: there's no API to
abuse, no auth to bypass, no stored user data to leak.

The realistic areas of concern are narrower:

- **The WEB tab's "import your own CSS" feature** takes user-provided text
  and renders it as CSS in a `<style>` tag. CSS injection can do visual
  damage (hence it being sandboxed to a demo preview card, not arbitrary
  page content) but can't execute script — there's no equivalent risk to
  `dangerouslySetInnerHTML` with arbitrary HTML, which this app does not
  use anywhere.
- **The bookmarklet export** generates a `javascript:` URI that the user
  explicitly drags to their own bookmarks bar and clicks on their own
  volition, on whatever page they're viewing. It only does what the
  generated CSS does (visual glitch styling) — it doesn't read page
  content, doesn't make network requests, and doesn't persist anything.
- **Dependency vulnerabilities** in the (currently two) runtime
  dependencies (`react`, `react-dom`). `npm audit` runs as part of CI's
  install step.

## Reporting a vulnerability

If you find something that doesn't fit the model above — e.g. a way for
imported CSS or a crafted upload to execute script, or a real XSS vector —
please open a private security advisory via GitHub's "Report a
vulnerability" button on the Security tab rather than a public issue.
Given the small scope described above, response time is best-effort, but
genuine reports will be taken seriously and credited in the fix.
