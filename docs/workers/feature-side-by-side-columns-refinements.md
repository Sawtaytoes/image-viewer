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

**Status:** ☐ needs work.

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

**Status:** ☐ needs work.

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

**Status:** ☐ needs work.

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

**Status:** ☐ needs work.

---

## P2 — Subtle separator between columns

**Report:** "there's no visible border between these. I know I said I didn't wanna lose height or
width, but I do want some very subtle separator."

**Proposed approach:** add `gap: 2px` to `columnsRowStyles` so the dark viewer background (`#333`)
shows through as a hairline between columns (negligible width loss). If it reads too faintly over two
bright images, bump to a 1–2px semi-opaque line via per-pane `border-left` on
`&:not(:first-of-type)`.

**Files:** `ImageViewer.jsx`.

**Status:** ☐ needs work.

---

## P2 — Scrollbar styling

**Report:** "The page scrollbar is a white color that doesn't match. Can we style it to look nicer?"

**Diagnosis:** The gallery scroll container uses the default Chromium scrollbar (light). The app is a
dark theme.

**Proposed approach:** add `::-webkit-scrollbar` rules to the global styles in
[App.jsx](../../src/components/App.jsx) (Electron is Chromium, so `-webkit-` works): dark track
(`#2b2b2b`), gray rounded thumb (`#555`, hover `#666`), ~12px. Applies app-wide (gallery, popovers).

**Files:** `App.jsx`.

**Status:** ☐ needs work.

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

**Status:** ☐ needs work.

---

## Already done in `adb2412` (no action)

- Action-bar **"Open N folders" button no longer wraps** — `toolkit/Button.jsx` now sizes to content
  with a 120px min-width (Yes/No in the modal unchanged).
- Queued **tabs open into columns** (the original "tabs don't do anything" gap).

## Open design questions to settle while implementing

- After all the above, **center-tap = open per-column menu** and **close = a menu action**. Confirm
  this is the final model before wiring (it replaces the current center-tap-to-close).
- Should a multi-column layout **persist** when you leave to the gallery and come back, or is
  clearing on exit fine? (Currently `◂ Folders`/`Esc` clears panes.)
- HEIC — see [feature-heic-support.md](feature-heic-support.md).
