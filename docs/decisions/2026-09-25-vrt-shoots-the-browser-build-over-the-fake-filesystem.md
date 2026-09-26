# 2026-09-25 — VRT shoots the browser build over the fake filesystem

- **Status:** Locked
- **Date:** 2026-09-25
- **Type:** CI / visual regression
- **Supersedes:** —
- **Superseded by:** —
- **Deciders:** Kevin (owner) + agent
- **Source:** T3 Code chat on the agentic branch `t3code/fix-castkit-time-weather-text`; fleet
  decision `agentic/docs/decisions/2026-09-25-every-owned-charcuterie-app-runs-vrt.md`

## Decision

Image Viewer runs the fleet's shared `vrt` job
(`Sawtaytoes/charcuterie/.github/workflows/shared-vrt.yml@workflows-v1`) from `ci.yml`. Its only
shot source is `scripts/vrtCapture.mjs`, passed as the workflow's `captureCommand`:

1. Build the **browser entry** (`index.browser.html` → `src/browserEntry.tsx`) with the renderer's
   own `vite.renderer.config.ts`, into `.vrt-build/`.
2. Serve it with the same extension-less-path fallback as `vite.browserModeSpaFallback.ts`.
3. Drive seven scenes in Chromium — `folders-root`, `folders-search`, `folders-sort-menu`,
   `images-by-name`, `images-by-date`, `viewer-single`, `viewer-two-columns` — each in the Wide View
   (1280x800) and a Narrow View (390x844), light and dark: **28 shots**, named
   `<scene>__<wide|narrow>__<light|dark>.png`.

Every pixel is fixture data: the folders and images come from `src/fakeFileSystem.ts` (generated
gradient BMPs in Abstract / Cats / Dogs / Landscapes / Mountains). Nothing reads a disk.

Determinism: `Date.now()` is pinned with `page.clock.setFixedTime` (the fake tree stamps modified
times off it and the Newest sort buckets them against "now"), timezone `UTC`, locale `en-US`,
reduced motion plus Charcuterie's freeze-motion stylesheet, device scale 1, and every shot waits
until each `<img>` has decoded and the image count has stopped changing. Three consecutive local
runs produced byte-identical PNG sets (`sha256sum`).

Playwright is **not** a dependency here. The script loads it from the shared workflow's own tools
(`$VRT_TOOLS`, browsers at `$VRT_BROWSERS_PATH`); locally, point `VRT_TOOLS` at
`<charcuterie>/packages/ci/src/vrt` after `npm ci` there.

## Context

The fleet rule of 2026-09-25 is that every owned Charcuterie app runs VRT, from Storybook stories or
from tests that render real UI. This repo has no Storybook, and it runs two ways: Electron
(`file://`, the preload bridge) and a plain browser (`window.api` from `src/browserApi.ts`). The
renderer bundle is the same in both; only the router history and the bridge implementation differ.

## What was rejected ("no, that's wrong")

- **Building a Storybook just for VRT.** It would be a second copy of the screens, and the fleet
  rule says a repo without Storybook shoots its real screens instead.
- **Shooting Electron under Xvfb.** The window chrome is the OS's, the bridge is frozen by
  `contextBridge`, and the renderer pixels are the same bundle the browser build shows.
- **Shooting the Vite dev server.** It is what `yarn dev:browser` serves, but a production build is
  what ships, and it is the one that runs the real Tailwind pass.

## Why

The browser build already exists for exactly this — driving the real renderer without touching real
files — so VRT reuses it and adds no app code. The seven scenes cover the three surfaces the owner
uses: the folder grid (with search and the sort picker), the image grid (by name and by date), and
the viewer (one column and two).

## Evidence

Owner, 2026-09-25, on the fleet decision: *"We have Storybook, so that's on avenue for VRT shots,
and some tests can also do them if it makes sense."* and *"Let's get that propagated to all of
them."*

## How to honor it

Keep scene names stable — a rename is a deleted shot plus a new one. A new screen gets a new scene
in `scripts/vrtCapture.mjs`. A flaky scene is fixed or removed with a comment, never re-run until it
passes.
