# 2026-06-02 — Set zoom factor 0.75 in preload

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 9e9de86 (port of 989e398)

## Decision (the rule)

Call `webFrame.setZoomFactor(0.75)` in `src/preload.js` as the Surface-Pro DPI workaround. Keep it in preload, never in the renderer.

## What was rejected ("no, that's wrong")

Leaving zoom at 1.0; or moving the `setZoomFactor` call into the renderer. The renderer can't import `electron` under contextIsolation.

## Why

The Surface Pro is scaled up, so 0.75 corrects the rendered size. The renderer has no electron access, so the call belongs in preload.

## How to honor it

Keep the `setZoomFactor(0.75)` call in `src/preload.js`. Don't "clean up" the magic number, and don't try to relocate it to the renderer.

## Evidence

commit 9e9de86 (port of 989e398) — `webFrame.setZoomFactor(0.75)` added in `src/preload.js`.
