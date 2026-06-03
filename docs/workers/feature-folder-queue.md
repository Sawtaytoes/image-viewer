# Worker brief: folder queue — workspace foundation + long-press multi-select + tab strip

- **Priority:** feature work. Depends on nothing structurally, but pairs with
  [feature-side-by-side-columns.md](feature-side-by-side-columns.md), which consumes the same
  `WorkspaceContext` this brief creates. Build this first, then columns.
- **Goal (user's words):** "queue up a set of folders from the filesystem… press and hold (with
  animation)… triggers the 'select multiple' state, and then all of them are configured to open… manage
  the list of those open folders, and when I close or delete one, it's gone from the queue."
- **Primary input is touch.** No gesture/animation library — pointer events + Emotion `@keyframes`.
- **Cross-refs:** [feature-side-by-side-columns.md](feature-side-by-side-columns.md),
  [refactor-image-cache-refcount.md](refactor-image-cache-refcount.md).

## What "queue" means here

A `WorkspaceContext` holds the user's **queued folders** and the **panes** (columns) that display them.
This brief delivers: the context + provider, the long-press multi-select flow in the file browser that
*populates* the queue, and a tab strip to manage it. The columns viewer that *consumes* panes is the
sibling brief.

### State shape (the foundation both features share)

`WorkspaceProvider` (new, wraps the tree — see App wiring below) holds:

```text
queuedFolders: [{ id, path, name }]               // id = stable unique id; name = basename(path)
panes:         [{ id, folderId | null, currentIndex }]   // folderId → queuedFolders[].id; null = empty pane
activePaneId:  string | null
```

- Queue entries store **identity only** (no derived `imageFiles`) — listings are derived per-pane via
  `useFolderListing(path)` (created in the columns brief) so the queue stays a cheap, serializable list.
- Panes reference folders **by id, never array position**, so removing a folder can't corrupt other
  panes' references.

### Mutations (all `useCallback`, exposed on the context value)

- `addFolderToQueue({ path, name })` / `addFoldersToQueue(folders[])` — push if `path` not already
  queued (**dedupe by path**).
- `removeFolder(folderId)` — drop it from `queuedFolders` **and** set `folderId = null` on every pane
  that referenced it (this is the "gone from the queue everywhere" requirement; panes don't vanish, they
  revert to the empty/`+` state).
- `addPane()` → `{ id, folderId: null, currentIndex: 0 }`; `removePane(paneId)`.
- `assignFolderToPane(paneId, folderId)` — set `folderId`, reset `currentIndex` to 0.
- `setPaneIndex(paneId, index)`; `setActivePaneId(paneId)`.

Generate ids without `Date.now()`/`Math.random()` concerns in app code via `crypto.randomUUID()`
(available in the renderer).

## Files to ADD

- **`src/components/workspace/WorkspaceContext.js`** — `createContext`, mirror
  [`FileSystemContext.js`](../../src/components/fileBrowser/FileSystemContext.js).
- **`src/components/workspace/WorkspaceProvider.jsx`** — the state + mutations above, `useMemo`'d
  provider value, modeled on
  [`FileSystemProvider.jsx`](../../src/components/fileBrowser/FileSystemProvider.jsx) /
  [`ImageLoaderProvider.jsx`](../../src/components/imageLoader/ImageLoaderProvider.jsx).
- **`src/components/workspace/FolderTabStrip.jsx`** — horizontal, scrollable
  (`overflow-x: auto; touch-action: pan-x; white-space: nowrap`) row of tabs from `queuedFolders`. Each
  tab: folder name + a close-X (`CloseIcon`) calling `removeFolder(id)` (stop propagation). Active tab
  highlighted (compose styles with `useMemo` like the dotted-border idiom in `VirtualizedList.jsx`).
  Tapping a tab loads that folder into `activePaneId` (or the first empty pane) via `assignFolderToPane`.
  (Rendered inside `RevealableChrome` in the columns brief; build it standalone here.)
- **`src/components/imageViewer/useLongPress.js`** — pointer-driven hold detector following the
  [`usePointerHover.js`](../../src/components/imageViewer/usePointerHover.js) idiom (callback in a ref,
  listeners attached in `useEffect` keyed on `domElementRef`, full teardown):
  - `pointerdown`: record start x/y + pointerId, `onStart`, kick a `requestAnimationFrame` loop calling
    `onProgress(fraction 0→1)` and a `setTimeout(holdMs)` firing `onComplete`.
  - `pointermove`: if `Math.hypot(dx, dy) > moveCancelPx` → cancel (clear timer + RAF, `onCancel`). This
    is what lets a vertical drag become a **scroll** instead of a long-press.
  - `pointerup` / `pointercancel` / `pointerout`: clear timer + RAF; if not completed → `onCancel`.
  - Thresholds: **holdMs ≈ 500**, **moveCancelPx ≈ 10**.
- **`src/components/fileBrowser/FillRing.jsx`** — reusable SVG ring driven by a `progress` prop (0→1)
  via `stroke-dasharray`/`stroke-dashoffset = circumference * (1 - progress)`. Keeps ring math out of the
  row. (No animation lib — the RAF loop in `useLongPress` drives it.)
- **`src/components/icons/CloseIcon.jsx`** and **`PlayArrowIcon.jsx`** — single `<path>` Material glyphs
  inside [`SvgIcon.jsx`](../../src/components/icons/SvgIcon.jsx), following
  [`ArrowBackIcon.jsx`](../../src/components/icons/ArrowBackIcon.jsx). (`PlayArrowIcon` = the "▶ Open N"
  affordance.)

## Files to MODIFY

- **`src/components/App.jsx`** — wrap the existing provider tree in `<WorkspaceProvider>` (outermost, so
  both the browser and the viewer can read it). Current order is
  `ImageViewerProvider > FileSystemProvider > ImageLoaderProvider`; put `WorkspaceProvider` at the top.
- **`src/components/fileBrowser/Directory.jsx`** — attach a `ref` + `useLongPress`:
  - `onProgress(fraction)` → drive a `FillRing` overlay on the tile.
  - `onComplete` → enter multi-select mode (lift to `FileBrowser`) and toggle this folder selected.
  - While multi-select is active, `onClick` **toggles selection** instead of `goToDirectory`; selected
    tiles get a checked style (compose with `useMemo`). When inactive, behavior is identical to today
    (`goToDirectory` — see lines 68-76). Add `touch-action: pan-y` to `directoryStyles` so the list still
    scrolls; rely on `useLongPress` move-cancel rather than `touch-action: none`.
- **`src/components/fileBrowser/FileBrowser.jsx`** — own the multi-select state: `isMultiSelectMode` +
  `selectedFolderPaths` (a `Set`). Provide `enterMultiSelect`, `toggleFolder`, `clearMultiSelect`, and
  `openSelectedFolders` (→ `addFoldersToQueue(...)` for each selected directory, then clear the mode).
  Pass these to rows — prefer a small `MultiSelectContext` over prop-drilling through
  `VirtualizedList`. Render an **action bar** when `isMultiSelectMode && selectedFolderPaths.size > 0`:
  a "▶ Open N folders" button (reuse [`toolkit/Button.jsx`](../../src/components/toolkit/Button.jsx))
  + Cancel; `N = selectedFolderPaths.size`. Guard the existing single-`selectedIndex` keyboard handler
  (the `useKeyboardControls` callback at lines 150-223) to no-op while in multi-select, mirroring its
  existing `if (isDeleteFileModalVisible || imageFilePath) return` early-out.
- **`src/components/fileBrowser/VirtualizedList.jsx`** — only touch if selection styling can't live in
  `Directory`. Prefer keeping it generic (selection styling stays in `Directory`).

## Reuse (don't reinvent)

- `usePointerHover.js` as the structural template for `useLongPress` (and `useEdgeSwipe` in the columns
  brief).
- `toolkit/Button.jsx` for the action-bar buttons (it already has the hover/active transition idiom).
- `SvgIcon.jsx` + the existing `icons/*` for new glyphs.
- The Emotion `useMemo(() => css\`${base} ${cond && extra}\`)` composition pattern used throughout
  (`ImageView.jsx`, `VirtualizedList.jsx`).

## Verify

- **Unit (Vitest):** `WorkspaceProvider` mutations — `addFoldersToQueue` dedupes by path;
  `removeFolder` nulls every pane that referenced it; `assignFolderToPane` resets `currentIndex`. A
  focused `useLongPress` test (fake timers + synthetic pointer events): completes after `holdMs`, cancels
  on >`moveCancelPx` move. Use the `vitest.setup.js` `window.api` stub.
- **Manual (`yarn start`), touch where possible:**
  - Long-press a folder → `FillRing` fills over ~500ms → enters multi-select; a quick drag instead
    scrolls the list (no accidental select).
  - Tap several folders to toggle; "▶ Open N folders" reflects the count; Cancel exits cleanly.
  - "Open N" adds them as tabs in `FolderTabStrip` (deduped); close-X on a tab removes it from the queue.
- **Done when:** folders can be multi-selected by hold, queued (deduped), shown as manageable tabs, and
  removing a tab removes the folder everywhere.
