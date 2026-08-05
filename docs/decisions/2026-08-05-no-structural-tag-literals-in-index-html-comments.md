# 2026-08-05 — No literal `<head>`/`<body>` tags inside index.html comments

- **Status:** Locked
- **Date:** 2026-08-05
- **Deciders:** Kevin (owner) + agent
- **Source:** chat — "issue with Image Viewer's fullscreen mode" → dev server rendered a blank window

## Decision (the rule)

Comments in `index.html` must not contain a **literal** `<head>` or `<body>`
tag (e.g. inside backticks in prose). Refer to them without the angle brackets —
"the head", `head`, "the `<head>` element" is fine only if reworded to plain
`head`. Vite injects its dev scripts at the first `<head>`/`<body>` it finds by
scanning the raw HTML, and a literal tag in a leading comment is matched *before*
the real one.

## What went wrong ("blank window")

The renderer mounted nothing under `yarn start` with
`@vitejs/plugin-react can't detect preamble`. The React Fast Refresh preamble
was present in the served HTML — but **inside** the big leading `<!-- … -->`
comment. The comment contained the phrase *"the inline first-paint script in
`` `<head>` ``"*, and Vite injected the preamble + `/@vite/client` right after
that commented `<head>`. Commented out, the preamble never ran, so
`window.$RefreshReg$` was never set and every app module's refresh header threw.

The fix was one line: reword the comment so it no longer contains a literal
`<head>`. Vite then injects after the real `<head>` (line 29), the preamble
runs, and the app renders. Verified by running electron-forge under Xvfb.

## Why it was so hard to find

- It only manifests under **electron-forge**'s dev server, not a bare `vite`
  dev server, so a standalone repro looked healthy.
- The error names React/Fast Refresh, which sent the first investigation down
  two-copies-of-React / `resolve.dedupe` and a Vite-version-mismatch path — all
  dead ends (see the reverted `dedupe` commit and the electron-forge 8 bump).
  The real cause was purely the HTML comment.

## How to honor it

- Keep `index.html`'s explanatory comments free of literal `<head>`/`<body>`
  tags. If you must name a tag, drop the angle brackets.
- If the app ever renders blank in dev with "can't detect preamble", **view the
  served HTML** (`curl http://localhost:<port>/`) and check whether the preamble
  `<script>` landed inside a comment before reaching for React/version theories.

## Evidence

Served HTML (electron-forge dev) showed the preamble `<script type="module">…
injectIntoGlobalHook …</script>` sitting between two halves of the leading
comment, right after the backticked `` `<head>` ``. Reworded → error gone,
renderer mounts (Xvfb run, renderer console clean).

## Related

- [[2026-08-03-follow-the-os-scheme-via-electron-nativetheme]] — the first-paint
  script the comment describes.
