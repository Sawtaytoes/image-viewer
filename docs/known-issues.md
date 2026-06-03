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

## Other deferred items

- **Manual parity pass still owed** now that image loading is fixed: opening a single image,
  second-window (Ctrl/Shift+click), and **delete → Recycle Bin** still need a human pass.
- Accessibility, performance deep-dive, file manager, multi-gallery, delete-confirmation UX, and the
  `.jsx → .tsx` conversion remain in [roadmap.md](roadmap.md).
