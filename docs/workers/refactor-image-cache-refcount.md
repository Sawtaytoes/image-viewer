# Worker brief: reference-count the image-loader cache

- **Priority:** HIGH — **prerequisite** for side-by-side panes. Land + verify this first; it ships with
  **zero** user-visible change in the current single-image view.
- **Why:** the redux-observable image cache is flat-keyed by `filePath` with **no reference counting**.
  Today that's fine because each `filePath` is mounted in exactly one place at a time. The moment two
  panes can show the same folder (see [feature-side-by-side-columns.md](feature-side-by-side-columns.md)),
  one pane unmounting will evict a blob the other pane is still displaying → broken image. This brief
  adds refcounting so eviction only happens when the **last** holder lets go.
- **Cross-refs:** [feature-folder-queue.md](feature-folder-queue.md),
  [feature-side-by-side-columns.md](feature-side-by-side-columns.md).

## The problem, concretely (verified in code)

1. **`addFilePathEpic` early-returns on a cache hit.**
   [`addFilePathEpic.js:22-25`](../../src/components/imageLoader/addFilePathEpic.js) filters out any
   `addFilePath` whose `filePath` already has a `downloadedFiles[filePath]` entry — so a second consumer
   "adding" the same path is a silent no-op (no counter is bumped).
2. **`unloadImage` evicts unconditionally.**
   [`ImageLoaderProvider.jsx:32-38`](../../src/components/imageLoader/ImageLoaderProvider.jsx) dispatches
   `removeFilePath({filePath})` → `removeFilePathEpic` → revokes the object URL + clears
   `downloadedFiles`/`imageDomElements`/`downloadPercentages`/queues for that path.
3. **Two unmount triggers fire that eviction:**
   - [`FileBrowser.jsx:105-112`](../../src/components/fileBrowser/FileBrowser.jsx) calls
     `unloadImage({filePath})` for **every** image in the current folder on unmount.
   - [`Image.jsx:91-110`](../../src/components/imageViewer/Image.jsx) toggles visibility off on unmount
     (the `!hasVisibilityDetection` branch), feeding the priority/standby queue logic.

With overlap: Pane A and Pane B both show folder X → Pane B closes → `unloadImage` revokes X's blobs →
Pane A's live `<img>` points at a revoked URL and its `useStateSelector` sees `imageDomElements[path]`
go null. The cleanup epic (`imageDomElementCleanupEpic`) is **correct**; the bug is the eviction
*trigger* firing while another holder is alive.

## The fix: a `referenceCounts` namespace, gate eviction behind count==0

Keep the cache flat-keyed by `filePath` (same file in two panes is byte-identical — one decoded blob +
one `<img>` is exactly right; do **not** namespace by paneId — that would re-download per pane). Add a
reference count keyed by `filePath`; only dispatch the real `removeFilePath` when the count hits 0, and
only dispatch the real `addFilePath` on the 0→1 transition.

### Files to ADD

- **`src/components/imageLoader/referenceCountsReducer.js`** — flat `{ [filePath]: number }`, modeled on
  [`downloadedFilesReducer.js`](../../src/components/imageLoader/downloadedFilesReducer.js) using
  `createNamespaceReducer(createReducer(...))`. Handlers: `retainFilePath` → `(state = 0) => state + 1`,
  `releaseFilePath` → `(state) => Math.max(0, state - 1)`. `initialState = 0`.
- **`src/components/imageLoader/referenceCountEpic.js`** — listens (via `ofType`) to `retainFilePath` /
  `releaseFilePath`, reads the **pre-update** count from `state$.value.referenceCounts[filePath]`, and:
  - on retain when previous count is falsy (0/undefined) → also dispatch the existing
    `addFilePath({ filePath, isVisible })` (preserve the `isVisible` flag so priority-queue ordering is
    unchanged);
  - on release when the count is about to reach 0 → dispatch the existing `removeFilePath({ filePath })`.

  Mirror the structure of [`addFilePathEpic.js`](../../src/components/imageLoader/addFilePathEpic.js)
  (`action$.pipe(ofType(...), pluck("payload"), map(...), mergeAll(), filter(Boolean), tap(dispatch))`).
  Be careful about ordering vs. the namespace reducer: read the count from `state$.value` to decide the
  transition (the `stateReducerEpic` runs first and has already applied the increment/decrement by the
  time other epics see the action — confirm and, if so, compare against `1`/`0` post-update instead;
  add a unit test that pins the exact transition semantics).

### Files to MODIFY

- **`src/components/imageLoader/imageLoaderActions.js`** — add `retainFilePath` and `releaseFilePath`
  via `createNamespaceActionCreator({ actionType, namespaceIdentifier: "filePath" })` (same shape as
  `addDownloadedFile`). Keep `addFilePath` / `removeFilePath` (plain `createActionCreator`) — the epic
  still dispatches them internally.
- **`src/components/imageLoader/reducers.js`** — register `{ namespace: "referenceCounts", reducer:
  referenceCountsReducer }`.
- **`src/components/imageLoader/createdReduxObservable.js`** — add `referenceCountEpic` to the `epics`
  array (after `stateReducerEpic`, which must stay first).
- **`src/components/imageLoader/ImageLoaderProvider.jsx`** — change `unloadImage` to dispatch
  `releaseFilePath`; add a `retainImage`/keep `updateImageVisibility` such that the **mount** path
  retains. Expose whatever the consumers below call. Keep `updateImageVisibility` dispatching for the
  visibility/priority behavior; the retain/release is the new orthogonal lifecycle signal.
- **`src/components/imageViewer/Image.jsx`** — on mount retain `filePath`, on unmount release it
  (replace/augment the visibility-off-on-unmount at lines 91-110). Visibility detection for the
  priority queue stays; refcount governs eviction.
- **`src/components/fileBrowser/FileBrowser.jsx`** — change the blanket unmount cleanup (lines 105-112)
  from `unloadImage` to release, so leaving a folder decrements rather than nuking shared entries.

## Reuse (don't reinvent)

- `createNamespaceReducer` + `createReducer` for the reducer; `createNamespaceActionCreator` for actions.
- The existing `addFilePath` / `removeFilePath` + `removeFilePathEpic` (the latter already does
  `URL.revokeObjectURL` + full per-path cleanup) — we only change **when** they fire.
- `useStateSelector` for any component that needs to read `referenceCounts` (per-key `Object.is`
  diffing already prevents over-render).

## Verify

- **Unit (Vitest — already configured):** a test that drives the epic/reducer directly:
  retain×2 then release×1 keeps the entry (no `removeFilePath`); the final release dispatches
  `removeFilePath`. Pin the transition semantics (0→1 dispatches `addFilePath`, →0 dispatches
  `removeFilePath`). Model the harness on `src/imageMimeTypes.test.js` + the `window.api` stub in
  `vitest.setup.js`.
- **Manual (`yarn start`), regression-only at this stage:** open a folder, scroll the gallery, open a
  single image, navigate, close. Behavior must be **identical** to before (this brief adds no UI). Watch
  DevTools for any broken `<img>`/revoked-blob console errors — there should be none.
- **Done when:** refcount governs eviction, all existing behavior is unchanged, and the unit test proves
  multi-holder retain/release.
