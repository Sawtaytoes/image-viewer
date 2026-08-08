# 2026-08-08 — Escape exits fullscreen before closing the viewer

- **Status:** Locked
- **Date:** 2026-08-08
- **Deciders:** Kevin (owner) + agent
- **Source:** chat — multi-column queue + fullscreen, Esc wiped every column with no feedback

## Decision (the rule)

In the image viewer, **Escape peels one layer at a time.** With the viewer open
and no menu/gallery overlay, Escape exits **OS fullscreen first** and leaves
every column and the queue alone. Only a later Escape (windowed) closes the
viewer via `clearPanes` / `leaveImageViewer`.

The stack, outermost first:

1. In-pane menu or gallery (already owned by those components; they disable the
   viewer keyboard while open)
2. **OS fullscreen** (`window.api.fullScreen` / `toggleFullScreen`)
3. Leave the viewer (drop all columns / legacy single-image view)

**Only Escape** is layered. Enter and Backspace still leave the viewer even
while fullscreen — they are not "dismiss chrome" keys.

## What was rejected ("no, that's wrong")

Mapping Escape straight to `clearPanes` while the window is fullscreen. That
jumped the user from multi-column viewing to the gallery (queue still active)
with no toast, tooltip, or transition that said what happened. Re-tapping a
queue tab then opened **one** column via `FolderTabStrip.handleSelect` (active
pane → empty pane → `addPane()`), so the multi-column layout looked "lost"
rather than closed on purpose.

## Why

Fullscreen is chrome. Closing every column is a large navigation change. Esc
must reverse the most recent / outermost mode first — the same rule the menu
and in-pane gallery already follow. Multi-column + queue is a core feature
([[2026-06-04-multi-folder-queue-and-side-by-side-are-core]]); a single key
must not silently discard that layout when the user only meant to leave
fullscreen. Instant unexplained jumps also violate
[[2026-06-03-ui-needs-visible-feedback]].

## How to honor it

- `useViewerKeyboard` owns the Escape branch: when `isFullScreen` and
  `onExitFullScreen` are set, Escape calls `onExitFullScreen` and **must not**
  call `onClose`.
- `Pane` and `LegacyImageColumn` pass `isFullScreen` + `toggleFullScreen` from
  `FullScreenContext` into that hook.
- Do not re-bind Escape → `clearPanes` unconditionally. Do not make Enter or
  Backspace exit fullscreen instead of leaving the viewer without a new
  decision.
- Electron OS fullscreen (`setFullScreen`) does **not** consume Escape the way
  the HTML Fullscreen API does — the renderer must exit it explicitly. The
  browser harness may also get a native Esc exit; still gate `onClose` so one
  Esc never both exits fullscreen *and* clears panes.

## Evidence

"When I have multiple columns open … and I click fullscreen, I want ESC to
first disable fullscreen. … ESC is exiting out of all queued columns (super
jarring) as there's no tooltip or notification … Suddenly, I was in the
gallery view page with a queue active. And when I click a queue item, I'm back
to 1-column instead of all the columns I had open." — chat (2026-08-08)

## Related

- [[2026-06-03-ui-needs-visible-feedback]]
- [[2026-06-04-multi-folder-queue-and-side-by-side-are-core]]
- [[2026-08-03-fullscreen-viewer-has-one-top-bar]]
- Menu/gallery Esc layering described in
  `docs/workers/feature-side-by-side-columns-refinements.md` (P0 keyboard)
