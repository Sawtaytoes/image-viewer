# Worker brief: side-by-side columns — refinements & fixes from live testing

- **Context:** follow-up to [feature-side-by-side-columns.md](feature-side-by-side-columns.md),
  which shipped in commit `adb2412` (the N-column viewer, queued tabs open columns, touch-summoned
  chrome, center-tap close). This brief captures feedback from the first hands-on (mouse + Windows)
  testing session. The base feature works; these are the rough edges and one trapping bug.
- **How to read this:** each item has the **report** (user's words), a **diagnosis**, a **proposed
  approach**, and the **files** involved. Priority order: P0 (trapping bug) → P1 (core UX) → P2
  (polish). HEIC is split into its own brief — see [feature-heic-support.md](feature-heic-support.md).
- **Baseline behaviors to keep in mind (current code):**
  - Panes are **ephemeral**: none until a folder is opened into a column; closing the last column
    returns to the gallery. The queue (tabs) persists. (`WorkspaceProvider`.)
  - The viewer renders **either** the legacy single image (`imageFilePath`) **or** the panes — never
    both. This OR is the root of the P0 trap below.
  - Center-tap currently **closes** a column; the chrome (`◂ Folders` / tab strip / `+`) is summoned
    by a **top-edge swipe down** and auto-hides.

---

## P0 — `+` traps the user (data-loss + dead-end)

**Report:** "I clicked '+', it added a new pane, but it also removed my old pane. And then, since I
didn't select folders, I can't continue." / "I would like to have _another_ folder/file viewer."

**Diagnosis:** Two compounding problems.
1. The viewer renders legacy **or** panes (`panes.length > 0 ? panes : legacy`). When you're viewing a
   single image (legacy `imageFilePath`, zero panes) and press `+`, `addPane()` makes
   `panes.length > 0`, so the render flips to the panes branch and the legacy image is **masked**
   (looks "removed"). See [ImageViewer.jsx](../../src/components/imageViewer/ImageViewer.jsx).
2. The freshly-added pane is empty, and the empty-pane affordance only opens a folder **picker of the
   queue**. With nothing queued there is **no escape** — no "close column", no "browse files". See
   [EmptyPaneAffordance.jsx](../../src/components/imageViewer/EmptyPaneAffordance.jsx) /
   [FolderPickerPopover.jsx](../../src/components/imageViewer/FolderPickerPopover.jsx).

**Proposed approach:**
- **Render the legacy image *and* panes together** as columns, so `+` never hides the current image.
  In `ImageViewer`, render `imageFilePath ? <LegacyImageColumn>` as column 0 **and** then
  `panes.map(<Pane>)`. `isOpen = imageFilePath || panes.length > 0`. Active-column logic:
  `isLegacyActive = imageFilePath && (activePaneId == null || !paneIds.includes(activePaneId))`; each
  pane `isActive = pane.id === activePaneId`. Center-tap on the legacy column still closes it
  (`leaveImageViewer`); center-tap on a pane opens its menu (see P1).
- Give **every** empty/filled pane real escape hatches via the per-pane menu (see P1's menu): "pick a
  queued folder", "open file manager for this column", "close column".

**Files:** `ImageViewer.jsx`, plus the P1 menu work.

**Status:** ☑ done (commit pending) — see Verification below.

---

## P0 — Empty pane must offer "queued folder OR file manager", scoped to that pane

**Report:** "It would be good to select a queued folder OR go to the file manager." / "And I'd be going
in that particular pane."

**Diagnosis:** The empty-pane picker only lists queued folders. There's no way to browse the
filesystem to fill a *specific* pane, and (with an empty queue) no way forward at all.

**Proposed approach — "pane-pick" mode (the design that was started, then reverted to keep the tree
clean; re-implement from here):**
- **WorkspaceProvider** gains `pendingPanePick: paneId | null` plus actions:
  - `startPanePick(paneId)` → set `pendingPanePick = paneId`.
  - `completePanePick({ path, name })` → dedupe-queue the folder (reuse if already queued), assign it
    to `pendingPanePick`, reset that pane's `currentIndex`, set it active, clear `pendingPanePick`.
  - `cancelPanePick()` → clear `pendingPanePick`.
  - `removePane`/`clearPanes` should also clear `pendingPanePick` if it referenced the removed pane.
- **ImageViewer** hides while a pick is pending so the gallery shows through:
  `isOpen = !pendingPanePick && (imageFilePath || panes.length > 0)`.
- **Gallery (`FileBrowser`)** shows a pick banner while `pendingPanePick` is set: the current folder
  name + **"Use this folder"** (`completePanePick({ path: filePath, name: basename(filePath) })`) +
  **"Cancel"** (`cancelPanePick`). Folder tiles still navigate normally so the user can drill to the
  target folder, then "Use this folder". Relax the `FileBrowser` keyboard guard so the gallery is
  usable during a pick (`panes.length > 0 && !pendingPanePick`).
- **Per-pane menu** (P1) gets an **"Open file manager"** row → `startPanePick(pane.id)`.

**Files:** `WorkspaceProvider.jsx`, `WorkspaceContext` consumers, `ImageViewer.jsx`,
`FileBrowser.jsx` (banner + keyboard guard), `FolderPickerPopover.jsx`.

**Status:** ☑ done (commit pending) — see Verification below.

---

## P1 — Per-column targeting + Kavita-style center-tap menu

**Report:** "Clicking these tabs at the top only works for the left-most area. If I wanna change any
other one, I cannot." / "clicking the middle instead selects that zone and ties it to the tabs … it's
a different control method, but … a better user experience." / "Clicking in the middle is now bringing
up a menu similar to how Kavita works."

**Diagnosis:** The chrome `FolderTabStrip` assigns to the **active** pane, and nothing ever sets a
non-first pane active, so tabs only ever change the left column. There's no per-column control and no
indication of which column is "selected".

**Proposed approach:**
- **Center-tap a column → select it (`setActivePaneId`) and open a per-pane menu** (reuse/extend
  `FolderPickerPopover`): list queued folders (tap → `assignFolderToPane(pane, folder)`), plus
  "Open file manager" (P0 pane-pick) and **"Close column"** (`removePane`). Highlight the pane's
  current folder in the list. This is the "Kavita menu".
- **Move "close" off the center-tap** — it now lives in the menu, since center-tap means
  "control this column".
- Rename `ImageView`'s `onClose` prop → `onCenterTap` (it no longer implies closing). Legacy column
  passes a close handler; panes pass an open-menu handler.
- Add a **subtle active-column indicator** (e.g. a 2px inset accent outline) shown when `isActive`
  and there is more than one column, so the user can see which column the chrome tabs target.
- `EmptyPaneAffordance` becomes presentational (just the `+`/label); the **`Pane`** owns the menu
  open/close state and renders `FolderPickerPopover` for both empty and filled panes.
- Keyboard: only the active column binds nav; disable it while the menu is open; `Esc` closes the
  menu first, then (next press) leaves the viewer.

**Files:** `ImageView.jsx`, `Pane.jsx`, `FolderPickerPopover.jsx`, `EmptyPaneAffordance.jsx`,
`ImageViewer.jsx`.

**Status:** ☑ done (commit pending) — see Verification below.

---

## P1 — Mouse can't summon the chrome

**Report:** "With a mouse, how do I do the pulldown or swipe up? Once I create a side-by-side, I can't
seem to add more."

**Diagnosis:** `useEdgeSwipe` relies on touch's **implicit pointer capture** to keep receiving
`pointermove` after the finger leaves the 32px hit-strip. A mouse has no implicit capture, so dragging
below the strip stops firing moves and the reveal never triggers — leaving the `+` unreachable after
the initial auto-show.

**Proposed approach:**
- **Reveal on hover** of the top edge: add `onPointerEnter` to the hit-strip → `reveal()` (the
  standard fullscreen-controls pattern). Keep the swipe for touch.
- Add a small **always-visible grab-handle** (a faint centered pill in the hit-strip) as a discoverable
  hint while the bar is hidden.
- Keep the bar visible while the pointer is over it (`onPointerEnter` cancels the auto-hide timer,
  `onPointerLeave` reschedules it).
- (Optional) add `setPointerCapture` in `useEdgeSwipe` so mouse-drag also works; guard for jsdom.

**Files:** `RevealableChrome.jsx` (and optionally `useEdgeSwipe.js`).

**Status:** ☑ done (commit pending) — see Verification below.

---

## P2 — Subtle separator between columns

**Report:** "there's no visible border between these. I know I said I didn't wanna lose height or
width, but I do want some very subtle separator."

**Proposed approach:** add `gap: 2px` to `columnsRowStyles` so the dark viewer background (`#333`)
shows through as a hairline between columns (negligible width loss). If it reads too faintly over two
bright images, bump to a 1–2px semi-opaque line via per-pane `border-left` on
`&:not(:first-of-type)`.

**Files:** `ImageViewer.jsx`.

**Status:** ☑ done (commit pending) — see Verification below.

---

## P2 — Scrollbar styling

**Report:** "The page scrollbar is a white color that doesn't match. Can we style it to look nicer?"

**Diagnosis:** The gallery scroll container uses the default Chromium scrollbar (light). The app is a
dark theme.

**Proposed approach:** add `::-webkit-scrollbar` rules to the global styles in
[App.jsx](../../src/components/App.jsx) (Electron is Chromium, so `-webkit-` works): dark track
(`#2b2b2b`), gray rounded thumb (`#555`, hover `#666`), ~12px. Applies app-wide (gallery, popovers).

**Files:** `App.jsx`.

**Status:** ☑ done (commit pending) — see Verification below.

---

## P2 — Breadcrumb path should be a button

**Report:** "While the 'go back' arrow is a button, this one is not." (pointing at the
`G:\Pictures\…` path text in the gallery header.)

**Diagnosis:** In [DirectoryControls.jsx](../../src/components/fileBrowser/DirectoryControls.jsx) the
path is a plain `<div>` that happens to be wired to `navigateUpFolderTree` (clicking it goes up one
level) but has no button affordance, so it doesn't read as interactive.

**Proposed approach:** render the path as **clickable breadcrumb segments**. Build ancestors safely
with the real path API (`window.api.path.dirname`/`basename` in a loop — do **not** hand-split on the
separator; Windows drive roots like `G:\` are fiddly). Each ancestor segment is a `<button>` →
`setFilePath(segmentPath)`; the last segment (current folder) is non-interactive "you are here". Add
`cursor: pointer` + hover. Use a chevron (`›`) separator to avoid double-backslash visuals, and strip
trailing separators from the drive-root label (`G:\` → display `G:`). Verified safe target: clicking a
segment uses the same `setFilePath` values `navigateUpFolderTree` already produces.

**Files:** `DirectoryControls.jsx`.

**Status:** ☑ done (commit pending) — see Verification below.

---

## Already done in `adb2412` (no action)

- Action-bar **"Open N folders" button no longer wraps** — `toolkit/Button.jsx` now sizes to content
  with a 120px min-width (Yes/No in the modal unchanged).
- Queued **tabs open into columns** (the original "tabs don't do anything" gap).

## Open design questions — settled

- **Center-tap = open per-column menu**, close is a menu action. **Confirmed** — wired as the final
  model (replaces center-tap-to-close). The legacy single-image column is the one exception: its
  center-tap still closes, since there's no folder to swap and the menu would only offer "close".
- **Clear panes on exit** (current behavior) is fine — you only leave the columns view once you're
  done comparing. Future idea the user floated (out of scope here): let a pane itself show a folder
  _gallery_ view, so leaving becomes rarer.
- HEIC — see [feature-heic-support.md](feature-heic-support.md).

## Verification

All items implemented and covered by the automated suite (`yarn test:run` — 56 tests, biome + eslint
clean). New tests: `fakeFileSystem.test.js`, `DirectoryControls.test.jsx` (breadcrumb),
`FolderPickerPopover.test.jsx` (per-column menu), and pane-pick lifecycle cases in
`WorkspaceProvider.test.jsx`.

**Fake-filesystem mode (for safe hands-on testing).** `yarn start:fake` (sets `IMAGE_VIEWER_FAKE_FS=1`)
launches the real app against an in-memory tree of generated images instead of the disk. See
[fakeFileSystem.js](../../src/fakeFileSystem.js): the tree lives in the preload, so **deletes are
virtual** (they mutate the in-memory tree and never call `shell.trashItem`/`fs.rm`) and **nothing ever
touches real files**. The flag is off by default, so the normal `yarn start` is unchanged. Use this to
exercise the columns/menu/delete flows without risk.

**Not yet done — real-disk hands-on pass.** Per the standing instruction, no destructive action was run
against the real filesystem. The interaction-heavy bits (touch center-tap menu, mouse hover-summon,
the active-column outline) are best confirmed visually; that walkthrough is left for a `yarn start`
(real FS) or `yarn start:fake` (sandbox) session.

### Post-implementation fixes (2nd live-testing round)

- **Touch double-tap / click-through (P0).** The viewer's center-tap fired on `onPointerDown`, so the
  tap closed the viewer mid-gesture and the trailing `pointerup`/`click` fell through to the gallery
  thumbnail behind it (closed to gallery _and_ immediately opened an image). The gallery tiles fire on
  `onClick`, so the viewer's tap-to-act handlers — center-close, empty-pane affordance, and every
  per-column menu row/backdrop — now also fire on `onClick`. A click is delivered as one unit to the
  tapped element and React only re-renders afterward, so nothing falls through. This also fixed the
  "can't get to the gallery to repick a column's folder" jank (same root cause in the menu).
- **`start:fake` was hitting real files.** A Vite-bundled preload can't read `process.env` reliably at
  runtime, so the flag is now read in **main** (`process.env.IMAGE_VIEWER_FAKE_FS`, the proven channel)
  and forwarded to the preload as a `--fakeFs` launch argument (same `additionalArguments`/`process.argv`
  path as `--filePath`). In fake mode main also stops handing the window a real launch path.
- **Animations.** Added entrance transitions so changes are legible: viewer fade-in, per-column
  slide/fade-in, menu backdrop-fade + popover scale-in, active-column outline fade, and the pick banner
  slides down. Exit (close-to-gallery) animation is still a possible follow-up.

### Post-implementation fixes (3rd live-testing round)

- **Folder-picking moved into the pane.** "Open file manager" no longer takes over the whole screen
  with the gallery; instead the column shows its own in-pane file browser
  ([PaneFolderPicker.jsx](../../src/components/imageViewer/PaneFolderPicker.jsx) +
  [usePaneFolderNavigation.js](../../src/components/imageViewer/usePaneFolderNavigation.js)) so the
  side-by-side view never disappears. Each pane keeps its own browse path. The global pane-pick flow
  (`pendingPanePick`/`startPanePick`/`completePanePick`/`cancelPanePick`, the `FileBrowser` banner, and
  the viewer-hide gating) is gone, replaced by `assignFolderPathToPane(paneId, { name, path })`.
- **Fixes the "center-tap kills the wrong column / phantom 3rd panel" bug.** Root cause: the
  full-screen pick exposed the gallery, where tapping an image thumbnail set the legacy `imageFilePath`.
  That added a phantom **legacy column** as column 0 — and the legacy column's center-tap closes
  (vs. a pane's, which opens the menu), so the left-most column "died" on center-tap. With picking now
  in-pane, the gallery is never exposed mid-pick, no stray legacy image is set, and the chosen folder
  lands in the exact pane you opened the picker from.

### Post-implementation fixes (4th live-testing round)

- **Scrambled layout when the picker showed images → fixed.** The first in-pane picker rendered each
  image with the canvas-based `Image`, which fits by mutating a per-path DOM node's `width`/`height`.
  A folder's image shown as a thumbnail there while the same image showed full-size in a column fought
  over that shared node, scattering both. New
  [ThumbnailImage.jsx](../../src/components/imageViewer/ThumbnailImage.jsx) renders a plain `<img>` off
  the loader's cached blob URL with `object-fit: contain` (lazy-loaded via IntersectionObserver), so any
  number of copies at any size coexist safely. All in-pane thumbnails use it.
- **Folder picker now shows folder tiles with previews** (gallery-style folder browsing), rebuilt on
  `ThumbnailImage`. Pick by seeing each folder's first image; tap to drill in, "Use this folder" to
  confirm.
- **New per-column "View as gallery".** A column-menu action (shown when the column has a folder) opens
  [PaneImageGallery.jsx](../../src/components/imageViewer/PaneImageGallery.jsx) — the folder's images as
  a tappable grid, in-pane; tapping one jumps the column straight to that image. "File manager" picks a
  folder; "gallery" picks an image within it. (Note: thumbnails lazy-load on scroll but aren't
  virtualized — fine for normal folders; very large folders could be made virtual later.)

### Post-implementation fixes (5th live-testing round) — in-pane overlays removed

The in-pane file-manager + image-grid overlays were still fiddly (dead up-arrow, awkward layout). Per
the user, they're **gone**, replaced by one simpler model:

- **Column menu is now: queued folders + a single "Gallery view" + "Close column".** "View as gallery"
  and "Open file manager" are removed. Deleted: `PaneFolderPicker`, `PaneImageGallery`,
  `usePaneFolderNavigation`, `ThumbnailImage` (and their tests).
- **"Gallery view" drops you into the real, full gallery** (`FileBrowser`) with panes preserved. Browse
  and queue folders exactly like the app's home. A floating bottom bar shows **"Use this folder"**
  (loads the folder you're in into the column you came from and returns to side-by-side) and **"Cancel"**.
  The bar is at the bottom so the breadcrumb/up controls stay usable; it hides during multi-select. Wired
  via `WorkspaceProvider.galleryPaneId` + `openGalleryForPane`/`closeGallery`, reusing
  `assignFolderPathToPane`.
- **Columns-only once panes exist.** The legacy single-image column now renders only when there are no
  panes, so it can never reappear as a stray left-most column beside them (the recurring "phantom column
  that dies on center-tap"). The single-image viewer still works on its own when no columns are open.
- Picking via "Use this folder" loads immediately and returns; tapping folders still navigates normally
  so you can drill into subfolders (the dead up-arrow problem is gone with the old in-pane browser).

### Post-implementation fixes (6th live-testing round) — back to an in-pane gallery (done right)

The full-screen "Gallery view" was the wrong call: it left the column to take over the whole screen
(and the floating pick banner overlapped the header / jumped between top and bottom). Per the user,
"Gallery view" should be the **regular gallery, inside that pane** — browse images, open one, or open
a new directory without leaving the side-by-side layout. Reinstated as a cleaner in-pane gallery:

- **New [PaneGallery.jsx](../../src/components/imageViewer/PaneGallery.jsx)** renders inside the column
  (not a portal/overlay): a header (up-button + breadcrumb-ish folder name + close ×), a scrollable grid
  of subfolder tiles and image thumbnails, starting at the column's current folder (or a drive root when
  empty) and free to navigate up/into any directory. State is **local to the pane**, so each column
  browses independently and the layout never disappears.
- **Tapping an image** loads its folder into the column (queued if new) and jumps straight to that image
  via `assignFolderPathToPane(paneId, { name, path }, imageIndex)` — the action now takes an optional
  image index (defaults to 0) — then drops back to the single-image view.
- **Long-press a folder to multi-select** and queue several at once, exactly like the home gallery —
  reuses `useLongPress`, `FillRing`, and `MultiSelectContext` with pane-local state and an "Open N
  folders" bar (`addFoldersToQueue`).
- **Thumbnails use a new [PaneThumbnail.jsx](../../src/components/imageViewer/PaneThumbnail.jsx)** — a
  plain `<img>` off the loader's cached blob URL (`object-fit: contain`, lazy via IntersectionObserver),
  not the canvas `Image`. This is the same fix the 4th round found: the canvas moves a single per-path
  DOM node, so showing one image as a thumbnail while it's full-size in another column scrambled both.
  Tiles: [PaneGalleryFolderTile.jsx](../../src/components/imageViewer/PaneGalleryFolderTile.jsx),
  [PaneGalleryImageTile.jsx](../../src/components/imageViewer/PaneGalleryImageTile.jsx).
- **Removed the old full-screen flow:** `galleryPaneId` / `openGalleryForPane` / `closeGallery` (and the
  `FileBrowser` pick banner + its viewer-hide gating) are gone. The home/no-panes gallery is unchanged.
- **Fake-fs colors are now per-folder** so you can tell which folder a column is showing at a glance
  (Cats=red, Dogs=blue, Landscapes=green, Mountains=teal, Abstract=purple; root loose images are
  near-gray), each folder's images fanning across a lightness band. See
  [fakeFileSystem.js](../../src/fakeFileSystem.js).
- Tests: `PaneGallery.test.jsx` (open-image-at-index, drill into a subfolder, close); the obsolete
  `galleryPaneId` cases in `WorkspaceProvider.test.jsx` were replaced with an image-index case.
