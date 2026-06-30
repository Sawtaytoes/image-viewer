# 2020-11-25 — Render images as <img>, not <canvas>

- **Status:** Locked
- **Date:** 2020-11-25
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 9a5333b "Changed Image to render image DOM elements instead of canvas", superseding canvas work ee0580f / 2b70b8e / 6fec7e7

## Decision (the rule)

Render images as plain `<img>` DOM elements, not `<canvas>`.

## What was rejected ("no, that's wrong")

`<canvas>` rendering. Note: `docs/roadmap.md` still lists "switch back to `<canvas>` for higher quality" — that line is STALE/superseded by this decision; do not act on it without the owner explicitly re-deciding.

## Why

`<img>` was a massive performance win over canvas.

## How to honor it

Keep `Image.jsx` on `<img>`; don't reintroduce canvas resize machinery.

## Evidence

9a5333b "Changed Image to render image DOM elements instead of canvas" (massive perf boost), superseding ee0580f / 2b70b8e / 6fec7e7.

## Related

[[2026-06-03-fit-images-from-intrinsic-size]]
