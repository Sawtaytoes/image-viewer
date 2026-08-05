# 2026-08-05 — In the fullscreen file browser the title bar is pinned, not auto-hiding

- **Status:** Locked
- **Date:** 2026-08-05
- **Deciders:** Kevin (owner) + agent
- **Source:** chat — "the fullscreen header … is always visible, but it's supposed to hide away yet doesn't … it overlays part of the normal menu making it hard to see any content"

## Decision (the rule)

In fullscreen **with the viewer closed** (the file browser), the `TitleBar` is
**pinned open** — exactly as it is windowed — and the `FileBrowser` insets its
content below it (`mt-(--title-bar-height)`). The bar never overlays the
directory controls.

The `TitleBar`'s own fullscreen auto-hide is **gone**. The only bar that
auto-hides anywhere is the viewer's `RevealableChrome`. The `TitleBar` now has
exactly two states:

- **Pinned open** (`translateY(0)`) — windowed, and the fullscreen file browser.
- **Standing down** (`translateY(-100%)`) — fullscreen **with the viewer open**,
  where `RevealableChrome` is the single top bar (see
  [[2026-08-03-fullscreen-viewer-has-one-top-bar]]). Unchanged by this decision.

## What was rejected ("no, that's wrong")

**The fullscreen file browser reclaimed the top strip and let the title bar
auto-hide over it.** The `FileBrowser` went full-bleed (`mt-0`) so the
`DirectoryControls` (up-a-folder, breadcrumb, sort) sat at `top-0` — the exact
strip the `fixed` title bar occupies. The bar's mouse reveal fired whenever the
cursor came within 32px of the top edge (where those controls live) and hover
kept it up, so moving *toward* the directory menu summoned the title bar *over*
it and it never settled hidden: "always visible … overlays the normal menu."

**Keeping the immersive auto-hide but making the reveal less eager.** Considered
and declined by the owner ("pin the bar, push the content down"): the file
browser is a grid with its own persistent top chrome, not an immersive single
image, so there is nothing to be immersive *about* — a stable, always-there bar
beats one that has to be summoned back.

## Why

The full-bleed-reclaim-plus-auto-hide pattern only pays off for the image
viewer, whose content is one edge-to-edge image and whose controls live in
`RevealableChrome`. The file browser's directory controls are permanent chrome;
an auto-hiding bar sharing their strip can only fight them. Pinning the bar and
insetting the content means nothing is ever covered and nothing has to be
summoned — the same contract the windowed browser already honors.

## How to honor it

- `TitleBar` is pinned whenever `isTitleBarActive`
  (`!(isFullScreen && isViewerOpen)`) and slid up otherwise. It owns no
  auto-hide timer, reveal listener, edge-swipe, or grab handle — do not re-add
  them. The slide is a plain `transform` on `isTitleBarActive`.
- `FileBrowser` uses the inset class
  (`mt-(--title-bar-height)`) in every state except fullscreen **with the viewer
  open**, where the fixed viewer overlay covers it and it goes full-bleed.
- Fullscreen exit stays reachable from the pinned title-bar button in the file
  browser, and from `RevealableChrome`'s exit button in the viewer.

## Evidence

- Unit tests: `convenience/TitleBar.test.tsx` — pinned open (`translateY(0)`)
  in the fullscreen file browser with no reveal strip mounted; still standing
  down (`translateY(-100%)`) in the fullscreen viewer.
- `typecheck`, full `vitest` run (131 tests), and biome/eslint on the touched
  files all pass.

## Related

- [[2026-08-03-fullscreen-viewer-has-one-top-bar]]
- [[2026-06-04-up-arrow-navigates-up-not-dropdown]]
- [[2026-06-30-queue-is-summonable-by-touch]]
- [[2026-06-03-touch-first-is-the-whole-point]]
