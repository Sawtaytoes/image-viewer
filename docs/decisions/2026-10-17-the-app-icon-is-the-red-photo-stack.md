# The app icon is the red photo stack

- **Status:** Accepted
- **Date:** 2026-10-17
- **Type:** Branding
- **Supersedes:** —
- **Superseded by:** —

## Decision

The app's mark is **`public/favicon.svg`**: a red (`#DC2626`) rounded square with a white
drawing of two stacked photos, one with a mountain and a sun. It follows the fleet's app-mark
style — one color, a white line glyph, `rx` 5.5 on a 24-unit square — in a color no other
app mark uses. It is also the renderer's favicon, and it is a byte-identical copy of the
workspace's canonical mark (`truenas/apps-icons/icons/image-viewer.svg`), so `cmp` between
the two is the drift check. A change to the mark starts there and is copied here.

Every platform's icon is **rasterized from that one SVG at package time** by
`scripts/appIcon.ts`, through Forge's `generateAssets` hook, into the gitignored `build/`:

- `build/icon.ico` — the Windows executable and the Squirrel installer (`setupIcon`).
- `build/icon.icns` — the macOS app bundle.
- `build/icon.png` (512 px) — the `.deb` and `.rpm` menu entries, and the Linux window,
  which reads it from `process.resourcesPath` (`extraResource`).

## Context

Until 2.13.0 the app had no icon on any platform, so every build showed Electron's default
mark. Four candidates were drawn and served side by side, each at 16–128 px on light and
dark backgrounds and beside other app marks in a taskbar: A, a purple single photo; B, this
red photo stack; C, a yellow side-by-side pair; D, a teal photo with a magnifying glass. The
owner chose B.

## Why

- **One source.** A committed `.ico`, `.icns` and `.png` would be three binaries that drift
  from the SVG and from each other, and a diff of a binary shows nothing. Rasterizing at
  package time makes the SVG the only thing to change.
- **Rendered per size, not scaled down.** `sharp` draws the SVG at each target size, so the
  16 px Windows icon keeps sharp strokes instead of being a blurred 1024 px bitmap.
- **The PNG ships beside the app, not inside `.vite/`.** The Forge Vite plugin packages only
  `.vite/`, so a file left in `build/` would be missing from the installed app.

## Evidence

- Owner, choosing from the served comparison page, 2026-10-17: *"Red B is good"* (T3 Code
  chat `bfbdc019-bd43-45f4-9e7e-df2c7214a3e5`).
- Owner, 2026-10-15, on "The app has no icon on any platform": *"Can we fix that?"* (same
  chat).
