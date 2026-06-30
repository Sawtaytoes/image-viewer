# 2026-06-03 — Fit images from intrinsic size

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 9b8fb10; resize-loop guard from chat (77f75e91)

## Decision (the rule)

Fit images from immutable `naturalWidth`/`naturalHeight` (never rendered width/height). Guard the resize handler against the scrollbar appear/disappear feedback loop (skip resize when window size hasn't actually changed); reserve the gutter with `scrollbar-gutter: stable`.

## What was rejected ("no, that's wrong")

Fitting from current rendered size (compounds rounding drift); a naive resize fix that shrank images while resizing the window.

## Why

Rendered dimensions change as the fit is applied, so reading them feeds rounding drift back in. The scrollbar toggling on/off triggers an infinite resize loop. Intrinsic dims are stable.

## How to honor it

Use intrinsic `naturalWidth`/`naturalHeight`; set `scrollbar-gutter: stable`; add a size-change guard (still allow a new image to redraw at the same canvas size).

## Evidence

"As I resize the browser window, my images are shrinking and not filling the space properly." — chat (77f75e91); commit 9b8fb10.

## Related

[[2020-11-25-render-images-as-img-not-canvas]]
