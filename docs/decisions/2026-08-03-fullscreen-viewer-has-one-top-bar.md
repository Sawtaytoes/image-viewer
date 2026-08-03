# 2026-08-03 — In fullscreen the viewer has ONE top bar, not two

- **Status:** Locked
- **Date:** 2026-08-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat — "issue with Image Viewer's fullscreen mode … two pull down menus … directory navigation controls not working … click them in a weird spot"

## Decision (the rule)

In fullscreen **with the viewer open**, exactly ONE auto-hiding top bar is
summonable — the viewer's own `RevealableChrome` — and it is anchored to the
very top (`top-0`). The custom `TitleBar` **stands down** there: it does not
reveal, mounts no summon strip, and stays slid up. `RevealableChrome` grows a
fullscreen-exit control so fullscreen stays exitable by touch without leaving
the viewer first.

No element that only exists to *reveal* a bar may sit above the content and
intercept a tap. The `TitleBar`'s top reveal zone is a `pointer-events-none`
grab handle plus a `document`-level `pointermove` listener (mouse) and the
existing edge-swipe (touch) — never a covering hit-strip.

## What was rejected ("no, that's wrong")

**Two independent auto-hiding bars both live in fullscreen.** `TitleBar` (pinned
`top-0`) and `RevealableChrome` (pinned `top-(--title-bar-height)`, ~40px lower)
each ran their own `useEdgeSwipe`, so one downward pull summoned *both*, stacked
— the "two pull down menus." Compounded by `FolderTabStrip` being mounted twice
(once in the covered `FileBrowser`, once in the chrome).

**An invisible `z-[9999]` hit-strip over the top 32px of the screen.** It existed
only to catch a mouse hover, but it sat above everything and swallowed taps on
the directory controls — reviving the exact "up-arrow brings down the pull-down
menu instead of going up a folder" complaint that
[2026-06-04-up-arrow-navigates-up-not-dropdown](2026-06-04-up-arrow-navigates-up-not-dropdown.md)
had already locked out (there, for the windowed viewer).

**The chrome bar pinned 40px below where the full-bleed viewer starts.** In
fullscreen the viewer fills from `top-0` but the chrome (and its hit-strip) drew
at `top-(--title-bar-height)`, so the controls' hitboxes sat offset from where
they appeared — "click them in a weird spot."

## Why

Fullscreen is OS-level (`window.api.fullScreen`), and the viewer is a fixed
overlay that fully covers the file browser. Two bars, a duplicate tab strip, and
a tap-eating strip are all invisible-until-summoned, so they only surface as
"tapping is broken" on the Surface — the app's primary input. One bar, anchored
where it draws, with nothing covering the controls, is the whole touch contract
([touch-first-is-the-whole-point](2026-06-03-touch-first-is-the-whole-point.md)).

## How to honor it

- `TitleBar` computes `isViewerOpen` (`panes.length > 0 || imageFilePath`) — the
  same open test `ImageViewer` uses — and when `isFullScreen && isViewerOpen` it
  stands down: edge-swipe/hover reveal both no-op and `isBarShown` is false. Do
  not re-add a title-bar reveal for that state.
- The `TitleBar` top reveal zone stays `pointer-events-none`. Mouse reveal is a
  `document` `pointermove` listener; touch reveal is the edge-swipe. Never put
  back a covering hit-strip.
- `RevealableChrome` anchors at `top-0` when `isFullScreen`, `top-(--title-bar-height)`
  when windowed (the title bar is really there windowed). Its fullscreen-exit
  button shows **only** when `isFullScreen` — windowed, the title bar owns exit
  and a second one would duplicate it.
- `FileBrowser` renders its `DirectoryControls` + `FolderTabStrip` only when
  `!isViewerOpen`, so exactly one `FolderTabStrip` is ever live.

## Evidence

Verified in the built renderer under a stubbed `window.api` (`fullScreen.get()
→ true`), driven with Playwright:

- Title bar element computed transform `matrix(1,0,0,1,0,-40)` (slid fully up)
  while the viewer is open — it is standing down.
- Chrome bar class contains `top-0` and not `top-(--title-bar-height)` in
  fullscreen.
- `Go up a directory` tapped at the very top of the fullscreen file browser
  navigated (title changed) instead of being swallowed or opening a menu.
- Zero `Go up a directory` controls mounted while the viewer is open (the
  `FileBrowser` copy is gated off); one `Exit fullscreen` control active in the
  chrome.

Unit tests: `convenience/TitleBar.test.tsx`,
`imageViewer/RevealableChrome.test.tsx`.

## Related

- [[2026-06-04-up-arrow-navigates-up-not-dropdown]]
- [[2026-06-30-queue-is-summonable-by-touch]]
- [[2026-06-04-chrome-reveal-is-gated-not-plain-hover]]
- [[2026-06-30-center-click-in-multiview-opens-the-modal]]
- [[2026-06-03-touch-first-is-the-whole-point]]
