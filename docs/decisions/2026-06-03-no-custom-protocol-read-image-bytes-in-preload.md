# 2026-06-03 — No custom protocol; read image bytes in preload

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 8ed8831; `docs/workers/fix-image-loading.md` (Fix C); `docs/known-issues.md`

## Decision (the rule)

Read image bytes through the preload bridge: `window.api.readImageData(filePath)` → `{ data: ArrayBuffer, mimeType }` → `Blob` in `createFileDownloadObservable.js`. Do NOT reintroduce a custom `safe-file-protocol://` scheme (`registerSchemesAsPrivileged` + `protocol.handle` + `net.fetch` + renderer XHR).

## What was rejected ("no, that's wrong")

The `safe-file-protocol` custom scheme. It never delivered pixels on Windows — the `/^2/` status guard vs `status === 0`, spaces/backslashes in non-standard-scheme URLs, and missing Content-Type from `net.fetch`.

## Why

The custom protocol was fragile on Windows paths; a direct preload read is simpler and actually works. A custom protocol is the "textbook" Electron pattern an agent will be tempted to re-add — do not.

## How to honor it

Keep the MIME mapping in `src/imageMimeTypes.js` (unit-tested). NOTE: an older `AGENTS.md` "Don't break these" entry said to KEEP `safe-file-protocol` — that was stale and is corrected by THIS decision.

## Evidence

commit 8ed8831; `docs/workers/fix-image-loading.md` (Fix C); `docs/known-issues.md` — custom protocol "never delivered pixels on Windows".

## Related

[[2026-06-02-electron-security-contextisolation-preload]]
