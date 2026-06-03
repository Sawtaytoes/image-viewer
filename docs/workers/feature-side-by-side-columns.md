# Worker brief: immersive side-by-side columns viewer

- **Priority:** feature work. **Depends on**
  [refactor-image-cache-refcount.md](refactor-image-cache-refcount.md) (so two panes can share a folder
  safely) and [feature-folder-queue.md](feature-folder-queue.md) (provides `WorkspaceContext` — the
  queue + panes state and mutations).
- **Goal (user's words):** "side-by-side views of images… side-by-side-by-side etc… swap between
  different folders in the queue in different views." Plus two tap indicators: center-tap an image to
  close back to the gallery, and a top-edge reveal to get the chrome/return to folders.
- **Key framing (confirmed with user):** *immersive full-image mode **is** the columns container.* There
  is **no separate split mode.** A single image is the **1-column** case (identical to today); the `+`
  button adds columns → side-by-side → side-by-side-by-side. The image fills the screen; chrome is
  summoned on demand.
- **Primary input is touch.** No gesture/animation library — pointer events + Emotion
  `@keyframes`/transitions.

## Confirmed UX

- **Columns, any count** — equal-width vertical columns; each is an independent pane with its own folder,
  current image, and prev/next.
- **Assign a folder to a pane:** tap an empty/`+` pane → a picker of queued folders → choose one.
- **Summon chrome = swipe DOWN from the top edge** (swipe up / tap image dismisses; auto-hide after a
  beat). Revealed chrome = top bar with `◂ Folders` (up to the folder listing), the `FolderTabStrip`
  (from the queue brief), and `+` (add pane).
- **Tap feedback (ripple + icon pulse, ~250ms):** center-tap an image → close → grid-icon pulse +
  ripple at the touch point; top-edge reveal → chevron + ripple.

## How it maps onto today's viewer (verified in code)

- [`ImageViewer.jsx`](../../src/components/imageViewer/ImageViewer.jsx) is a `position:fixed` full-screen
  flex column (header `ImageViewControls` + `ImageView`), shown when
  [`ImageViewerContext`](../../src/components/imageViewer/ImageViewerContext.js) `imageFilePath` is set.
- [`ImageView.jsx`](../../src/components/imageViewer/ImageView.jsx) centers one `Image` and has two 30%
  `onPointerDown` nav zones (touch-friendly already). The **center "close" is currently the full-area
  `onClick={leaveImageViewer}` at line 135** — no bounded zone, no feedback.
- [`useImageNavigation.js`](../../src/components/imageViewer/useImageNavigation.js) indexes into
  `FileSystemContext.imageFiles` + the single `ImageViewerContext` image — needs generalizing per pane.
- [`Image.jsx`](../../src/components/imageViewer/Image.jsx) already isolates one image (ResizeObserver
  fit, progress bar) and takes `fileName`/`filePath` props — reuse verbatim inside a pane.

## Files to ADD

- **`src/components/fileBrowser/useFolderListing.js`** — `from(window.api.readDirectory(folderPath))`
  → `{ directories: useDirectories(contents), imageFiles: useImageFiles(contents) }`. This consolidates
  logic **currently duplicated** in
  [`FileSystemProvider.jsx:80-117`](../../src/components/fileBrowser/FileSystemProvider.jsx) and
  [`Directory.jsx:78-92`](../../src/components/fileBrowser/Directory.jsx). Lets each pane own its own
  listing subscription keyed by `folderPath`, independent of the single global current folder.
- **`src/components/imageViewer/usePaneNavigation.js`** — the index math from `useImageNavigation.js`
  (lines 13-40: `goToNextImage`/`goToPreviousImage`/`isAtBeginning`/`isAtEnd`) parameterized by
  `{ imageFiles, currentIndex, setCurrentIndex }`.
- **`src/components/imageViewer/Pane.jsx`** — one column. Reads the pane's folder from
  `WorkspaceContext`, calls `useFolderListing(folder.path)` + `usePaneNavigation`, and renders the
  `ImageView` body (center close-zone + L/R 30% nav zones) for the current image. If `folderId === null`
  → render `EmptyPaneAffordance`. Set `touch-action: none` on the pane root (it isn't scrollable; this
  keeps taps/edge-swipe from being read as browser pan/zoom).
- **`src/components/imageViewer/EmptyPaneAffordance.jsx`** — centered `AddIcon` + "Tap to pick folder";
  `onClick` opens `FolderPickerPopover` for this pane.
- **`src/components/imageViewer/FolderPickerPopover.jsx`** — lists `queuedFolders` (reuse tab/row
  styling); choosing one → `assignFolderToPane(paneId, folderId)` + close. Render inside the pane
  (`position:absolute; inset:0;` translucent backdrop) — no portal needed.
- **`src/components/imageViewer/RevealableChrome.jsx`** — a thin top **hit-strip** (`height:32px; top:0;
  touch-action:none`) wired with `useEdgeSwipe` (`onReveal` → show chrome + spawn a `reveal` TapFeedback
  at the touch x). The sliding bar itself: `position:fixed; top:0; transform: translateY(${visible ?
  '0' : '-100%'}); transition: transform 220ms ease;`. Contents (flex row): a `◂ Folders` button
  (Button-style; leaves the viewer / `navigateUpFolderTree`), the `FolderTabStrip`, and a `+` button
  (`addPane`). Auto-hide via a `setTimeout` (~3s) reset on interaction; also dismiss on `useEdgeSwipe`
  upward swipe and on image tap.
- **`src/components/imageViewer/useEdgeSwipe.js`** — pointer hook (same `usePointerHover` idiom):
  qualify a `pointerdown` as a top-edge swipe only when `clientY <= edgePx` (≈32); on `pointermove`
  compute `dy`; **reveal** when `dy >= thresholdPx` (≈60) or downward velocity ≥ ~0.3 px/ms; **dismiss**
  on an upward swipe of similar magnitude when already revealed. Optional `onProgress(dy/threshold)` so
  the bar can track the finger. Reused to trigger the chevron+ripple reveal feedback.
- **`src/components/imageViewer/TapFeedback.jsx`** + **`useTapFeedback.js`** — `TapFeedback` renders at
  `{ x, y }` (`position:absolute; transform: translate(-50%, -50%)`): a ripple ring
  (`@keyframes ripple { from { transform: scale(0); opacity:.5 } to { transform: scale(3); opacity:0 } }`,
  ~250ms) + an icon pulse (`GridIcon` for `close`, `ChevronDownIcon` for `reveal`). Self-removes on
  `onAnimationEnd`. `useTapFeedback` returns `{ feedback, spawn }`; `spawn({ x, y, variant })` pushes an
  instance (id via `crypto.randomUUID()`) and prunes on done. Emotion auto-namespaces keyframes inside a
  `css` block — no animation lib.
- **Icons** (single `<path>`, follow
  [`ArrowBackIcon.jsx`](../../src/components/icons/ArrowBackIcon.jsx)): `GridIcon`, `ChevronDownIcon`,
  `AddIcon`, `FolderIcon`. (`CloseIcon`/`PlayArrowIcon` come from the queue brief — don't duplicate.)

## Files to MODIFY

- **`src/components/imageViewer/ImageViewer.jsx`** — become the **N-column flex row**: a container
  (`display:flex; flex-direction:row`) of `Pane`s, each `flex: 1 1 0; min-width: 0` (equal columns, any
  count). Host the `RevealableChrome` overlay and the `TapFeedback` layer (so feedback outlives a pane
  close). Render when `WorkspaceContext.panes.length > 0` **OR** the legacy `imageFilePath` is set.
- **`src/components/imageViewer/ImageView.jsx`** — replace the full-area `onClick={leaveImageViewer}`
  (line 135) with a bounded **center zone** sitting between the two 30% nav zones (`left:30%; right:30%;
  top:0; bottom:0; position:absolute`) using `onPointerDown` to capture `clientX/clientY` →
  `spawn({ x, y, variant: 'close' })` then close (close immediately; the feedback layer lives on
  `ImageViewer` and finishes its ~250ms animation). Leave the L/R nav zones + their `usePointerHover`
  opacity untouched so the single-column behavior is identical.
- **`src/components/imageViewer/useImageNavigation.js`** — re-implement as a thin adapter over
  `usePaneNavigation` (feed it `FileSystemContext.imageFiles` + the `ImageViewerContext` image/index) so
  the legacy single-image overlay keeps working unchanged.
- **`src/components/fileBrowser/FileSystemProvider.jsx`** and **`Directory.jsx`** — swap their inline
  `readDirectory` + derive logic for `useFolderListing` (consolidation; no behavior change).
- **Viewer keyboard handling** — extract the arrow/Escape/Backspace/Enter logic from
  [`ImageViewControls.jsx`](../../src/components/imageViewer/ImageViewControls.jsx) into a small hook
  (e.g. `useViewerKeyboard`) acting on the **active pane**, so it survives the header becoming
  swipe-summoned. (Keyboard is secondary — touch is primary — but don't regress it.)

## `touch-action` / scroll-fighting notes (flag in review)

- Pane root + chrome top hit-strip: `touch-action: none` (viewer isn't scrollable; prevents pan/zoom
  hijack of taps and the summon swipe).
- `FolderTabStrip`: `touch-action: pan-x` (it scrolls horizontally).
- Do **not** put `touch-action: none` on file-browser rows — that kills vertical scroll; the long-press
  in the queue brief relies on move-cancel instead.

## Compatibility — single-column == today

One pane at `flex:1` showing one image is visually/behaviorally identical to today's full-screen
`ImageView` (L/R 30% zones, center close, keyboard nav), minus the header now being swipe-summoned. The
legacy `ImageViewerContext` single-image entry path stays working as a one-pane render. The refcount
brief is the safety net that makes any overlap between the legacy overlay and a pane non-fatal.

## Suggested sequencing (within this brief)

1. `useFolderListing` + `usePaneNavigation` (+ rewire `FileSystemProvider`/`Directory`, adapt
   `useImageNavigation`) — pure refactor, no behavior change.
2. `TapFeedback` + `useTapFeedback` + icons → wire the **center-tap-to-close** into `ImageView` (works in
   today's single view immediately, independently demoable).
3. `useEdgeSwipe` + `RevealableChrome` (+ `FolderTabStrip` from the queue brief).
4. Columns: `Pane`, `EmptyPaneAffordance`, `FolderPickerPopover`; convert `ImageViewer` to the N-column
   flex row.

## Verify

- **Unit (Vitest):** `useEdgeSwipe` (reveal/dismiss thresholds with synthetic pointer events + fake
  timers); `usePaneNavigation` index clamping (start/end boundaries).
- **Manual (`yarn start`), touch where possible:**
  - Single image opens/navigates/closes exactly as before (1-column regression check).
  - Center-tap closes with a ripple + grid-icon pulse; left/right zones still navigate.
  - Swipe down from the top → chrome slides in (chevron+ripple), tabs switch the active pane's folder,
    auto-hides on tap-away / swipe-up.
  - `+` adds a column; tap an empty pane → picker → folder loads; each column navigates independently.
  - Two panes on the **same** folder, close one → the other keeps its image (refcount holds the blob);
    remove that folder's tab → it leaves every pane with no broken images.
- **Done when:** the viewer renders N independent equal-width columns, each driven by a queued folder,
  with touch-summoned chrome and both tap indicators — and the single-image case is unchanged.
