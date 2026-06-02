# Roadmap (post-upgrade phases)

Phase 1 (the current modernization — see [upgrade-plan.md](upgrade-plan.md)) is **upgrade + secure
refactor + tooling + tests + docs only**. Everything below is deferred and tracked here so nothing
from the original `TASKS.md` or the kickoff conversation is lost.

## Owner's headline goals (from the kickoff)

1. **Startup speed** — "takes forever to load"; the single most important improvement. Profile cold
   start; lazy-load the image pipeline; self-host fonts; trim bundle. (`wmic` removal in Phase 1 is a
   first down-payment — see [research/0006](research/0006-drive-enumeration-wmic.md).)
2. **Built-in file manager / file viewer** — so the app no longer depends on Windows Explorer.
3. **Multiple galleries at once / side-by-side views** — open more than one folder; compare.
4. **Delete UX** — the delete *path* is fixed in Phase 1 (trash via `shell.trashItem`). Still to do:
   a real "Are you sure?" confirmation wired to keyboard (`[Enter]`=yes/`[Esc]`=no) and **guarding the
   stray `[Delete]` key** the owner hits by accident.
5. **Full TypeScript conversion** of `src/**` (Phase 1 only sets up TS tooling — see
   [research/0004](research/0004-typescript-strategy.md)).

## Carried over from the original `TASKS.md`

### Global / cross-window
- Unified data store shared between windows.
- Title-bar text: current image name + directory; window placement on the right side of screen.
- `[Escape]` un-highlights from view; clicking re-highlights.
- Custom scrollbar overlay to stop shaky resize when the scrollbar appears/disappears.
- Fix second-instance white-screen / multi-window-not-loading (most visible in the packaged exe).
- Keyboard-state provider so each component can enable/disable keys based on screen state.
- Load fonts locally instead of from Google Fonts (faster multi-instance startup).
- Priority levels for image loading; focused window bumps its images' priority; off-screen images
  lowest priority; throttle very-low-priority downloads; keep images cached until a max size is hit.

### Image loader
- Respect the 4-image pipeline; single queue with states instead of multiple queues; load images from
  the directory listing rather than from `Image` components.

### Performance
- Stop loading `FileBrowser` thumbnails until the `ImageViewer` image is loaded (needs hi/lo priority).
- Fix the load/unload memory leak for folders of images.

### File browser
- Show image count per directory; stylize the loading progress bar; thumbnail-size slider; sort by
  last-modified (not just alphabetical) and persist sort in local storage.
- Hover/click highlight on controls, images, and folders.
- Folder-delete confirmation modal with `[Enter]`=yes; un-hide the folder delete icon.
- Handle inaccessible/disconnected drives gracefully; loading indicator for slow directory listings.
- Show `filePath` as the window title; show which file/folder is being deleted; rename "Directory"→"Folder".

### Image viewer
- Zoom with mouse-wheel and pinch (changes center-click behaviour).
- Editable URL via `history` (possibly React-Router-DOM).
- Hover/click highlight on controls; fix stuck hover state.
- `[Delete]` to delete with a key-driven confirmation modal (see Delete UX above).
- Switch back to `<canvas>` rendering for higher quality.

### Future / maybe
- Cache directory listings (parent + subdirs), SWR-style.
- Thumbnail storage keyed by image hash + date, with size handling and cache purging
  (time-based, max-size, on thumbnail-size change); drop `img.src` once `canvas` is loaded to save RAM;
  cap cached image memory to a % of machine RAM; debounced cache eviction by last-viewed time.
- Second thread for image loading + predictive prefetch.

### Accessibility (deferred from the upgrade)
- The touch-first UI uses clickable `<div>`s everywhere; the Biome a11y rules
  `useKeyWithClickEvents` and `noStaticElementInteractions` are currently **off**. Give interactive
  elements proper roles/`tabIndex`/keyboard handlers (or use real `<button>`s) and re-enable the rules.

### Tooling / infra (optional, later)
- ESM-everywhere (`"type": "module"`) to fully match mux-magic; deeper Biome/ESLint rule tuning.
- Re-enable `complexity/useArrowFunction` once the `function`-with-`prototype` action creators are
  reworked (or converted to TS) so the rule no longer needs to be disabled.
