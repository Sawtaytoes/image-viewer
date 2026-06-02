# Known issues (post Phase 1)

Status after the Phase 1 modernization, from a real run of the packaged app on Windows 11
(G:\Pictures). See [progress-log.md](progress-log.md) for the build/verification history.

## ✅ Confirmed working

- App launches and is **noticeably faster** to start than the old build (the owner confirmed).
- Secure model is live (contextIsolation + preload `window.api`); no `remote`/Node errors.
- **Folder/file listing works** — directories render with names, navigation in/out works, the title bar
  shows the path. This proves `window.api.readDirectory` / `statPath` / drive enumeration all work.

## ❌ BUG: image thumbnails / images do not load (HIGH PRIORITY)

**Symptom:** In the file browser, folders list correctly but every image tile is blank — only the thin
white horizontal "loading/progress" bar shows and never fills/clears. So image *downloads* start but
never deliver pixels. (Screenshots from the owner show `G:\Pictures` and `G:\Pictures\Maui 2025` with
named folders but no thumbnails.)

**This is isolated to the custom `safe-file-protocol` image-fetch path.** Everything that uses
`window.api` (listing) works; only the image bytes don't arrive.

See the detailed investigation + fix brief: **[workers/fix-image-loading.md](workers/fix-image-loading.md)**.

Short version of the suspected cause: the migration replaced Electron's removed
`protocol.registerFileProtocol` (which returned a file *path* and let Chromium serve it) with
`protocol.handle(...) => net.fetch(pathToFileURL(filePath))` over a **non-standard** privileged scheme.
Likely culprits, in rough priority order:
1. XHR/fetch to a **non-standard** custom scheme may be rejected or mis-parsed — it probably needs
   `standard: true` (which then changes how the Windows path/host is parsed in the URL).
2. `net.fetch('file://…')` may fail or return no usable `Content-Type` (the renderer reads
   `Content-Type` to build the image `Blob`).
3. Windows path encoding (drive letter, spaces, backslashes) may not round-trip through the URL →
   `request.url` → `decodeURIComponent` → `pathToFileURL` chain.

Fix it by reproducing in dev (`yarn start` auto-opens DevTools) and reading the Console/Network errors
for the `safe-file-protocol://` requests — the brief lists concrete experiments and code sketches.

## Other deferred items

- **Manual parity not fully checked yet** because image loading blocks it: opening a single image,
  second-window (Ctrl/Shift+click), and **delete → Recycle Bin** still need a human pass once images work.
- Accessibility, performance deep-dive, file manager, multi-gallery, delete-confirmation UX, and the
  `.jsx → .tsx` conversion remain in [roadmap.md](roadmap.md).
