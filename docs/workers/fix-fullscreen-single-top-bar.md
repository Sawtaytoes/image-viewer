# Worker: fix fullscreen — single top bar, no tap-stealing, anchored chrome

**Status:** Done (2026-08-03). Renderer-only change; verified in the built
renderer under a stubbed bridge + full unit suite. Packaged-app pass on the
Surface still owed (see below).

## The report

Three bugs, fullscreen only:

1. **Tapping is broken** near the top of the screen.
2. **Two pull-down menus** appear when pulling down from the top.
3. **Directory navigation controls don't work** — you have to "click them in a
   weird spot."

## Root cause

The app mounts three unconditional siblings (`src/components/App.tsx`):
`FullScreenProvider > TitleBar, FileBrowser, ImageViewer`. `ImageViewer` is a
`position: fixed` overlay that fully covers `FileBrowser` when open;
`FileBrowser` is never hidden underneath.

- **Two revealable bars, both live in fullscreen.** `TitleBar` (`top-0`,
  `z-[10000]`) and the viewer's `RevealableChrome` (`top-(--title-bar-height)`,
  `z-[3]`) each ran their own `useEdgeSwipe`. One downward pull summoned both,
  stacked ~40px apart → "two pull-down menus." `FolderTabStrip` was also mounted
  twice — `FileBrowser` **and** `RevealableChrome`.
- **A `z-[9999]` invisible hit-strip** (`TitleBar`) over the top 32px of the
  whole screen, there only to catch a mouse hover, sat above everything and
  swallowed taps — reviving the locked-out "up-arrow opens the menu instead of
  going up" bug (`docs/decisions/2026-06-04-up-arrow-navigates-up-not-dropdown.md`),
  now in fullscreen.
- **The chrome pinned 40px too low.** In fullscreen the viewer fills from
  `top-0`, but the chrome bar + its hit-strip drew at `top-(--title-bar-height)`,
  so hitboxes sat offset from where controls appeared — "weird spot."

## The fix (design: unify to one bar)

Decision record:
[`docs/decisions/2026-08-03-fullscreen-viewer-has-one-top-bar.md`](../decisions/2026-08-03-fullscreen-viewer-has-one-top-bar.md).

- **`src/components/convenience/TitleBar.tsx`**
  - Compute `isViewerOpen = panes.length > 0 || Boolean(imageFilePath)` and
    `isTitleBarActive = !(isFullScreen && isViewerOpen)`.
  - When not active: edge-swipe reveal/dismiss no-op, the bar stays slid up
    (`isBarShown = !isFullScreen || (isTitleBarActive && isBarVisible)`), and no
    summon strip mounts.
  - Replaced the interactive `z-[9999]` hit-strip with a `pointer-events-none`
    grab-handle pill (visual only) + a `document`-level `pointermove` listener
    for the mouse reveal (gated to fullscreen, active, hidden). Touch still
    reveals via the edge-swipe. Nothing covers the controls anymore.

- **`src/components/imageViewer/RevealableChrome.tsx`**
  - Anchor the hit-strip and the bar to `top-0` in fullscreen,
    `top-(--title-bar-height)` windowed (two static classes, picked at render —
    Tailwind can't interpolate).
  - Added a fullscreen-exit control (`FullscreenExitIcon` → `toggleFullScreen`),
    shown **only** when `isFullScreen`, so touch users can leave fullscreen
    without first leaving the viewer (the title bar's own exit stands down there).

- **`src/components/fileBrowser/FileBrowser.tsx`**
  - Render `DirectoryControls` + `FolderTabStrip` only when `!isViewerOpen`, so
    exactly one `FolderTabStrip` is ever live and no dead controls sit under the
    overlay.

## Tests

- `src/components/convenience/TitleBar.test.tsx` — the bar stands down (transform
  `translateY(-100%)`) and mounts no grab handle in fullscreen+viewer; a summon
  swipe is ignored there; once hidden in fullscreen the grab handle is
  `pointer-events-none`; windowed the bar is always pinned open.
- `src/components/imageViewer/RevealableChrome.test.tsx` — anchors `top-0`
  fullscreen / `top-(--title-bar-height)` windowed; carries the exit control only
  in fullscreen and it calls `toggleFullScreen`.
- Full suite: 131 pass. `tsc --noEmit`, `biome check`, `eslint`, and
  `vite build` (the gate that sees a missing Tailwind utility) all clean.

## Verification (built renderer under a stubbed bridge)

Because the change is renderer-side reaction to `isFullScreen`, it was driven in
a normal browser: the built `dist/` served with an injected `window.api`
(`fullScreen.get() → true`, a small fake tree), Playwright-driven. Confirmed:

- Title-bar element computed transform `matrix(1,0,0,1,0,-40)` (slid up) while
  the viewer is open — standing down.
- Chrome bar class has `top-0`, not `top-(--title-bar-height)`, in fullscreen.
- `Go up a directory` tapped at the very top of the fullscreen browser navigated
  instead of being swallowed / opening a menu.
- Zero `Go up a directory` mounted while the viewer is open; one active
  `Exit fullscreen` in the chrome.

Screenshots (gitignored scratch): `__screenshots__/fs-0*.png`.

## Still owed

A pass in the **packaged app on the Surface** (`yarn start:fake` or a real
build): pull down in fullscreen with the viewer open (one bar, at the top);
tap image center/edges (modal / prev-next) including the top region; tap the
go-up / breadcrumb where they draw. The harness proves the DOM/CSS; only the
device proves the touch feel.
