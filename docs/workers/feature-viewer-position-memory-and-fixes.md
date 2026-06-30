# Worker brief: viewer position memory, folder-delete, and live-test fixes

- **Context:** follow-up to
  [feature-side-by-side-columns-refinements.md](feature-side-by-side-columns-refinements.md). Captures
  a second hands-on testing session (mouse + Windows, multi-window). The columns viewer, the queue
  (tabs), the touch-summoned chrome, and the per-column **center-tap menu** all work; this brief is
  the next round of decisions and rough edges.
- **How to read this:** each item has the **report** (user's words), the **decision** (what we agreed
  to build — these are the design calls to honor), a **proposed approach**, the **files** involved,
  and **open questions** where a call still needs making. Priority: P0 (trapping bug) → P1 (core UX)
  → P2 (polish).
- **A few items revise changes that landed in the immediately-prior session** (current-image gallery
  outline, the `Delete image` row, per-row remove-from-queue ✕). Those changes may be uncommitted on
  `feat/typescript-conversion` when you pick this up — reconcile against the live tree, not against a
  specific commit. Where this brief contradicts that session, **this brief wins** (it's newer
  feedback).

## Baseline behaviors to keep in mind (current code)

- **Center-tap** on a column opens the per-column **modal**
  ([FolderPickerPopover.jsx](../../src/components/imageViewer/FolderPickerPopover.jsx)); **center-hold**
  opens that column's in-pane **gallery** ([PaneGallery.jsx](../../src/components/imageViewer/PaneGallery.jsx)).
- The modal lists **queued folders** (tap → `assignFolderToPane`, which **resets the column's index to
  0**), each row now has a trailing **✕ = remove from queue** (immediate, no confirm, touches no
  files), plus actions: **Gallery view**, **Delete image** (see P1 — being changed), **Close column**.
- The queue is **per-window** renderer state
  ([WorkspaceProvider.jsx](../../src/components/workspace/WorkspaceProvider.jsx)); `queuedFolders` carry a
  per-window `id` and a stable `path`. There is **no cross-window shared state** today.
- Folder/file deletion goes through `window.api.deleteFilePath({ filePath, isDirectory })`
  (OS recycle bin via `shell.trashItem`; fake-FS mirror for manual testing). See
  [main.js](../../src/main.js) / [fakeFileSystem.js](../../src/fakeFileSystem.js).
- A pane's listing comes from `useFolderListing(path)`
  ([useFolderListing.js](../../src/components/fileBrowser/useFolderListing.js)); it now exposes
  `refreshListing()`. `Pane` already **clamps** `currentIndex` to the listing length on every render.

---

## P0 — Nav-edge hover state gets stuck after window blur (image 4)

**Report:** "It looks like one of the galleries got stuck with the mouse-hover state when clicking
around and blurring the window. I can't get it to go away anymore even by clicking the 'right side' of
that gallery."

**Diagnosis:** The left/right nav overlays light up on hover via
[usePointerHover.js](../../src/components/imageViewer/usePointerHover.js) (engages on `pointerenter`,
clears on `pointerleave`). When the window **loses focus** while the pointer is over an edge — or when
an overlay above the edge unmounts — no `pointerleave` is delivered, so `isHovering` stays `true` and
[ImageView.jsx](../../src/components/imageViewer/ImageView.jsx)'s `showNavigationControlStyles` (and the
red `unavailableNavigationStyles` at the start/end of a folder) stay painted. Clicking the edge
navigates but never resets the hover flag.

**Proposed approach:**
- In `usePointerHover`, also clear `isHovering` on `window` **blur** and on `pointercancel` (and
  consider `document` `visibilitychange` → hidden). A real hover re-arms on the next `pointerenter`.
- Belt-and-suspenders: have `ImageView` force both edge hover flags back to `false` on `window` blur.

**Files:** `usePointerHover.js`, `ImageView.jsx`.

**Open questions:** none — straightforward reset-on-blur.

---

## P1 — Global, cross-window "resume where I left off" per folder

**Report:** "If I'm in this 'queue' view, keep track of which image I last selected. No matter the open
window. Make that a global one for all windows. If I click on a queued item, I wanna go _back_ to the
spot I left off in that gallery." / "If I have two of the same folder open at once, only the
last-one-wins, but both can be in different states. The _only_ time it 'starts where you left off' is
when you click the queued item **from the modal that pops up when you center-click**."

**Decisions (honor these exactly):**
1. Track, **per folder**, the **last image index** that folder was viewed at.
2. This memory is **global across all Electron windows** — not per-window renderer state.
3. **Last-one-wins:** the same folder can be open in two columns/windows at different indices; whoever
   changes their index most recently overwrites the single stored value. We do **not** keep per-column
   history.
4. **Restore happens on exactly one path:** picking a queued folder **from the center-click modal**
   (`FolderPickerPopover` row tap). Every other entry point keeps current behavior:
   - **top tab strip** select → no restore (or keep as-is),
   - **gallery tile tap** → jumps to the tapped image (already correct),
   - **`+` / fresh column / first open** → start at index 0.

**Proposed approach:**
- **Key by `path`, not the queue `id`.** Queue ids are minted per-window, so they can't address a
  shared store; the folder path is stable across windows.
- **Store in the main process** (a `Map<path, index>`), exposed through the preload as something like
  `window.api.getFolderLastIndex(path)` / `window.api.setFolderLastIndex(path, index)`. In-memory is
  enough for "across windows in one session"; persisting to disk would also survive restarts (see open
  question). Mirror it in `fakeFileSystem` so manual testing works.
- **Write** on every committed index change for a folder — i.e. wherever `setPaneIndex` lands a new
  `currentIndex`, also push `(folderPath, index)` to the store. (Debounce/coalesce is fine; rapid
  arrow-stepping shouldn't spam IPC.)
- **Read** only in the modal's `pickFolder`: resolve the folder's `path`, fetch its last index, and
  assign the pane at that index instead of 0. Today `assignFolderToPane(paneId, folderId)` hard-resets
  to 0 — add a modal-only variant (or an optional index arg) so the tab strip's reset-to-0 stays
  unchanged. The async listing + existing `currentIndex` clamp in `Pane` already handle a stored index
  that now exceeds a shrunken folder.

**Files:** `main.js`, `preload.js` (+ `preload.d.ts`), `fakeFileSystem.js`,
`WorkspaceProvider.jsx` (write on index change; modal-pick assign-with-index),
`FolderPickerPopover.jsx` (read + restore on row tap), `Pane.jsx`.

**Open questions:**
- **Persist across app restarts, or session-only?** Brief assumes session-only (in-memory main-process
  map). Say if you want it written to disk (electron-store / a json in userData).
- **Tab-strip select:** confirmed *no* restore there, right? (Only the center-click modal restores.)

---

## P1 — Delete the **folder**, not a single image (images 2 & 3)

**Report:** "I don't see a red trashcan to delete that gallery. Right now I can remove them from the
queue (great!) but no way to delete them. It doesn't have to be in this modal, but it should be
somewhere." / "You added 'Delete Image', but I wanted to delete the whole **folder**. Do we ever delete
a single image anyway? I thought we only delete galleries/folders?"

**Decisions:**
1. **The viewer deletes folders, not single images.** Remove the just-added **Delete image** action.
   (The file browser's own file/dir delete is separate and stays.)
2. There must be a **red trashcan** affordance to **delete a queued folder from disk** (OS trash, with
   the existing "Are you sure?" confirm modal). Placement is flexible — does **not** have to be in the
   center-click modal.
3. Deleting a folder is distinct from **remove-from-queue** (the ✕, which stays — immediate, no files
   touched).

**Proposed approach (recommended):**
- Give **each queued-folder row** (in `FolderPickerPopover`) a **red trashcan** next to the ✕:
  - ✕ → `removeFolder(id)` (queue only — already built),
  - 🗑 (red) → confirm modal → `deleteFilePath({ filePath: folder.path, isDirectory: true })`, then
    `removeFolder(id)` so the now-deleted folder also leaves the queue, and sever any panes on it.
  This lets you delete **any** queued folder, not just the current column's.
- Use the existing [DeleteFileModal](../../src/components/toolkit/DeleteFileModal.jsx) for the confirm
  (the wording is generic: "delete this file or directory?").
- Remove the `Delete image` row + `onDeleteImage` plumbing added last session in
  `FolderPickerPopover` / `Pane`. (The `refreshListing()` added to `useFolderListing` is still useful —
  keep it for post-delete refresh.)
- After a folder delete empties a column, **auto-load the next queued folder** — see the next item.

**Files:** `FolderPickerPopover.jsx`, `WorkspaceProvider.jsx` (a `deleteFolder` that trashes +
dequeues + severs panes), `Pane.jsx` (drop `Delete image`).

**Open questions:**
- **Per-row trashcan** (delete any queued folder, recommended) **vs.** a single bottom "Delete this
  folder" acting on the **current column's** folder? Brief recommends per-row; confirm.

---

## P1 — Closing/emptying a column auto-loads the next queued folder (image 4)

**Report:** "When closing a queued gallery, if there's another not-opened gallery available, we should
load the next one in the queue in the tab. As you can see, 'Tap to pick folder' is open because I
closed that gallery from another tab, but if we _had_ another one ready in the queue, we could display
it there automatically. Saves some clicks."

**Decision:** When a column becomes **empty** because its folder was closed/removed (from this column
or from another tab), **auto-assign the next queued folder that isn't already open in another column**,
instead of leaving an empty "Tap to pick folder" pane. If no such folder exists, fall back to the empty
pane (current behavior).

**Proposed approach:**
- Centralize "fill empty panes" in `WorkspaceProvider`. After any op that can empty a pane
  (`removeFolder`, the new `deleteFolder`, clearing a single column), for each pane with
  `folderId == null` pick the **first** queued folder whose `id` is **not** in the set of
  `folderId`s currently held by other panes, and assign it.
- Respect the existing **"open elsewhere"** notion — don't auto-load a folder that's already shown in
  another column (that's why it dedupes against other panes' `folderId`s).
- Decide ordering: "next in the queue" = first not-currently-open queued folder in queue order.

**Files:** `WorkspaceProvider.jsx` (the fill logic), possibly `Pane.jsx` /
[EmptyPaneAffordance.jsx](../../src/components/imageViewer/EmptyPaneAffordance.jsx) if the trigger is
better placed pane-side.

**Open questions:**
- Does this apply to **`Close column`** too (which removes the pane entirely via `removePane`), or only
  to **emptied-but-still-present** panes? The report is about an empty pane that *stayed*, so the brief
  scopes it to **emptying** (folder severed), not full column removal. Confirm.
- If the user **manually** emptied a column to go pick a different folder, auto-filling could fight
  them. Acceptable since they can ✕/close again? (Brief assumes yes.)

---

## P2 — Opening the gallery pre-selects the **next** image (image 1)

**Report:** "When I open a new gallery view, have it select the next image in line."

**Decision:** When a column opens its in-pane gallery and it already has a current image, the
**highlighted/selected** tile should be the **next** image (currentIndex + 1, clamped to the last
image) — and the gallery should **scroll that tile into view** — rather than highlighting the current
image. This suits the cull-forward flow.

**Proposed approach:**
- This **supersedes** last session's "outline the current image" in the gallery. Change the selected
  tile from `currentImagePath` to the **next** image's path (clamp at the end so the last image stays
  selected if there's no next).
- Add **scroll-into-view** for the selected tile when the gallery mounts (the gallery grid is
  `overflow-y: auto`; today it always opens scrolled to top).

**Files:** `Pane.jsx` (pass the next image's path/index instead of the current),
`PaneGallery.jsx` (scroll the selected tile into view on mount),
[PaneGalleryImageTile.jsx](../../src/components/imageViewer/PaneGalleryImageTile.jsx) (already supports
an `isCurrent`/selected outline — rename to read as "selected").

**Open questions:**
- Confirm "select the next image" = **highlight + scroll to** `current + 1` (not auto-open it). Image 1
  also circles the **`+`** in the chrome — is "open a new gallery view" specifically the **`+` / new
  column** flow, or any time the gallery opens? Brief assumes **any** gallery open on a column that has
  a current image.

---

## Suggested order

P0 stuck-hover (quick, trapping) → P1 delete-folder + auto-load-next (they pair up) → P1 position
memory (the only cross-process piece; do it as its own change) → P2 next-image-on-gallery-open.
