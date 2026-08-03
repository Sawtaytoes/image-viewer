# Known issues (post Phase 1)

Status after the Phase 1 modernization, from a real run of the packaged app on Windows 11
(G:\Pictures). See [progress-log.md](progress-log.md) for the build/verification history.

## ✅ Confirmed working

- App launches and is **noticeably faster** to start than the old build (the owner confirmed).
- Secure model is live (contextIsolation + preload `window.api`); no `remote`/Node errors.
- **Folder/file listing works** — directories render with names, navigation in/out works, the title bar
  shows the path. This proves `window.api.readDirectory` / `statPath` / drive enumeration all work.

## ✅ FIXED: image thumbnails / images do not load

**Was:** In the file browser, folders listed correctly but every image tile was blank — only the thin
white horizontal "loading/progress" bar showed and never filled/cleared. Images *downloads* started but
never delivered pixels.

**Cause:** the migration replaced Electron's removed `protocol.registerFileProtocol` with a
**non-standard** privileged `safe-file-protocol://` scheme served by `protocol.handle(...) =>
net.fetch(pathToFileURL(filePath))`, fetched from the renderer by XHR. That chain had several
Windows-fragile failure points (the `/^2/` status guard vs `status === 0`, spaces/backslashes in the
non-standard-scheme URL, and `net.fetch('file://…')` Content-Type).

**Fix (Fix C from the brief):** dropped the custom protocol entirely. Images are now read off disk in
preload via `window.api.readImageData(filePath)` → `{ data: ArrayBuffer, mimeType }`, and
[`createFileDownloadObservable.js`](../src/components/imageLoader/createFileDownloadObservable.js)
builds the `Blob` from those bytes (emitting 100% up front since local reads are instant). This removed
`registerSchemesAsPrivileged` + `protocol.handle` + `net`/`pathToFileURL` from `src/main.js`. MIME
mapping lives in [`src/imageMimeTypes.js`](../src/imageMimeTypes.js) (unit-tested). See the brief:
**[workers/fix-image-loading.md](workers/fix-image-loading.md)**.

**Still needs a human pass in the packaged build** (`yarn package`): confirm thumbnails render in
`G:\Pictures` / `G:\Pictures\Maui 2025`, open a single image, then the manual parity items below.

## ✅ FIXED: HEIC/HEIF photos don't show up

**Was:** iPhone `.heic`/`.heif` photos were filtered out at listing time and, even if listed, Chromium
can't decode HEIC so they'd never render.

**Fix:** added the extensions to the listing filter and transcode HEIC→JPEG in the main process
(`heic-convert`/libheif) inside a new `readHeicAsJpeg` IPC handler that `readImageData` routes to; the
renderer pipeline is unchanged. Decoded JPEGs are cached by `path+mtime`. Branch `feat/heic-support`;
details in [workers/feature-heic-support.md](workers/feature-heic-support.md). **Still owed:** a GUI pass
(tiles render + open in single/columns, EXIF orientation correct) and a thumbnail-perf follow-up for
large HEIC folders.

## ✅ FIXED: fullscreen mode — broken taps, two pull-down bars, off-target directory controls

**Was (fullscreen only):** tapping near the top of the screen "didn't work properly"; pulling down from
the top revealed **two** stacked pull-down bars; and the directory navigation controls (go-up,
breadcrumb) had to be "clicked in a weird spot."

**Cause:** the viewer is a fixed overlay over an always-mounted file browser, and in fullscreen **two**
independent auto-hiding top bars were live — the custom `TitleBar` (pinned `top-0`) and the viewer's
`RevealableChrome` (pinned ~40px lower) — each with its own summon gesture, so one pull summoned both
(and `FolderTabStrip` was mounted twice). A `z-[9999]` invisible hit-strip over the top 32px, there only
to catch a mouse hover, sat above everything and **swallowed taps** on the directory controls — reviving
the locked-out ["up-arrow opens the menu instead of going up"](decisions/2026-06-04-up-arrow-navigates-up-not-dropdown.md)
bug. And the chrome drew 40px below where the full-bleed viewer starts, so its hitboxes were offset.

**Fix (unify to one bar):** in fullscreen with the viewer open, the `TitleBar` **stands down** (no
reveal, no strip, stays put) and `RevealableChrome` is the single bar, re-anchored to `top-0` with a
fullscreen-exit control added. The tap-stealing hit-strip is gone — the top reveal zone is now a
`pointer-events-none` grab handle plus a document-level `pointermove` listener (mouse) / edge-swipe
(touch). `FileBrowser` drops its `DirectoryControls` + `FolderTabStrip` while the viewer is open.
Decision: [in fullscreen the viewer has ONE top bar](decisions/2026-08-03-fullscreen-viewer-has-one-top-bar.md);
brief: [workers/fix-fullscreen-single-top-bar.md](workers/fix-fullscreen-single-top-bar.md). **Still owed:**
a touch pass in the packaged app on the Surface.

## Other deferred items

- **Manual parity pass still owed** now that image loading is fixed: opening a single image,
  second-window (Ctrl/Shift+click), and **delete → Recycle Bin** still need a human pass.
- Accessibility, performance deep-dive, file manager, multi-gallery, delete-confirmation UX, and the
  `.jsx → .tsx` conversion remain in [roadmap.md](roadmap.md).
