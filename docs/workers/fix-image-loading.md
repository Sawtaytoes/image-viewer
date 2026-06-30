# Worker brief: fix image loading (safe-file-protocol)

> **✅ RESOLVED (2026-06-03)** via **Fix C** below: the custom `safe-file-protocol` scheme was dropped
> entirely. Images are read off disk in preload (`window.api.readImageData` → `{ data: ArrayBuffer,
> mimeType }`) and turned into a `Blob` in `createFileDownloadObservable.js`; `registerSchemesAsPrivileged`
> + `protocol.handle` + `net`/`pathToFileURL` were removed from `src/main.js`. MIME mapping lives in
> `src/imageMimeTypes.js` (unit-tested). Still owed: a packaged-build (`yarn package`) human verification.
> The original investigation is kept below for context.

- **Priority:** HIGH — images don't render after the Phase 1 upgrade (folder listing works).
- **Owner-observed:** packaged app on Windows 11, `G:\Pictures`. Folders list (fast!), every image tile
  is blank with a stuck thin white progress bar.
- **Context:** written right after the migration by the agent who did it, before context was lost.
  Cross-refs: [../known-issues.md](../known-issues.md), [../decisions/2026-06-02-electron-security-contextisolation-preload.md](../decisions/2026-06-02-electron-security-contextisolation-preload.md).

## How image loading works (the data flow)

1. **Renderer requests bytes over a custom scheme.**
   [`src/components/imageLoader/createFileDownloadObservable.js`](../../src/components/imageLoader/createFileDownloadObservable.js)
   builds `safe-file-protocol://<filePath>` (only `#`→`%23` escaping) and does an
   `XMLHttpRequest` GET with `responseType = 'arraybuffer'`. On `loadend` it:
   - **guards on `xmlHttpRequest.status.toString().match(/^2/)`** — bails unless the status starts with `2`;
   - reads `getAllResponseHeaders()`, regex-extracts `Content-Type`, builds `new Blob([this.response], { type: mimeType })`,
     emits `{ fileBlob }`.
   - The `progress` event drives the download-percentage (the white bar you see).
2. **Redux-observable epics** drive it: `downloadFileEpic` → `downloadFileCompletionEpic`,
   percentages in `downloadPercentagesReducer`, blobs in `downloadedFilesReducer`. The
   [`Image`](../../src/components/imageViewer/Image.jsx) component renders the resulting blob.
3. **Main process serves the file.** [`src/main.js`](../../src/main.js):
   - registers the scheme **non-standard**: `registerSchemesAsPrivileged([{ scheme: 'safe-file-protocol',
     privileges: { supportFetchAPI: true, stream: true, bypassCSP: true } }])`.
   - handles it: `protocol.handle(PROTOCOL_NAME, (request) => { const filePath =
     decodeURIComponent(request.url.slice('safe-file-protocol://'.length)); return
     net.fetch(pathToFileURL(filePath).toString()) })`.

The **old (working) code** used `protocol.registerFileProtocol` and just returned the decoded *path*;
Chromium then read the file itself (status 200, auto mime). `registerFileProtocol` was removed, so the
migration replaced it with `protocol.handle` + `net.fetch`. The bug is almost certainly in faithfully
reproducing "status 200 + correct Content-Type + bytes" through this new path.

## Hypotheses (rough priority)

1. **The `/^2/` status guard kills it.** Responses from custom-scheme XHR frequently report
   `status === 0` even on success. If so, `saveImageDataUrl` returns early and no blob is ever emitted —
   exactly "download bar shows, image never appears". *Cheapest thing to check first.*
2. **XHR to a non-standard scheme is rejected / mis-parsed.** Custom schemes used with XHR usually need
   `standard: true`. But `standard: true` makes Chromium parse `safe-file-protocol://G:\…` with the
   drive letter as the *host* (lowercased, backslashes mangled) — so you'd also have to change the URL
   shape (e.g. `safe-file-protocol://local/<percent-encoded-abs-path>`) and rebuild the path from
   `new URL(request.url).pathname` in the handler.
3. **`net.fetch('file://…')` fails or returns no `Content-Type`.** The renderer derives the Blob mime
   from the `Content-Type` header; if it's missing/empty the `<img>` may not render. Prefer reading the
   file in the handler and returning a `Response` with an explicit `content-type`.
4. **Path round-trip** (drive letter, spaces, backslashes) through `request.url` → `decodeURIComponent`
   → `pathToFileURL` is wrong for some inputs (note real folders here have spaces: `Maui 2025`, `Air Maui`).

## Reproduce + debug (do this first)

```bash
yarn start          # dev mode; DevTools opens automatically
# navigate to G:\Pictures  (dev defaults to D:\Pictures via a hack in
# FileSystemProvider.jsx — type/click into G:\ instead, or set the path)
```

- **DevTools → Network**, filter `safe-file-protocol` → open one request: is it `(failed)`,
  `(pending)` forever, or `200` with an empty body? Note the status + response headers.
- **DevTools → Console**: look for `ERR_UNKNOWN_URL_SCHEME`, `ERR_FAILED`, CORS, or thrown errors.
- **Main process logs**: temporarily add logging in `protocol.handle`:
  ```js
  protocol.handle(PROTOCOL_NAME, async (request) => {
    const filePath = decodeURIComponent(request.url.slice(`${PROTOCOL_NAME}://`.length))
    console.log('[safe-file]', request.url, '->', filePath)
    try { const res = await net.fetch(pathToFileURL(filePath).toString()); console.log('  status', res.status, res.headers.get('content-type')); return res }
    catch (error) { console.error('  FETCH ERR', error); return new Response('err', { status: 500 }) }
  })
  ```
  (Main-process `console.log` shows in the terminal running `electron-forge start`.)
- Add one log in `createFileDownloadObservable.js` `saveImageDataUrl`: print `xmlHttpRequest.status`
  and `xmlHttpRequest.getAllResponseHeaders()` — confirm/deny hypothesis #1.

## Candidate fixes (pick based on what debugging shows)

**Fix A — robust handler that reads the file itself (recommended; preserves the scheme + progress bar):**
```js
// src/main.js — replace the net.fetch handler
const MIME = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.gif':'image/gif',
  '.webp':'image/webp', '.bmp':'image/bmp', '.svg':'image/svg+xml', '.avif':'image/avif',
  '.apng':'image/apng', '.ico':'image/x-icon', '.cur':'image/x-icon' }
protocol.handle(PROTOCOL_NAME, async (request) => {
  const filePath = decodeURIComponent(request.url.slice(`${PROTOCOL_NAME}://`.length))
  try {
    const data = await fs.promises.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    return new Response(data, { status: 200, headers: { 'content-type': MIME[ext] ?? 'application/octet-stream' } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
})
```
Then, if hypothesis #1 is confirmed, **also relax the renderer status guard** in
`createFileDownloadObservable.js` to accept `status === 0` for the custom scheme (or just check
`this.response` is non-empty).

**Fix B — if XHR still won't touch the scheme:** register it `standard: true, secure: true,
supportFetchAPI: true, stream: true` and switch the renderer URL to a host form
(`safe-file-protocol://local/${encodeURIComponent(absolutePath)}`), parsing
`decodeURIComponent(new URL(request.url).pathname.slice(1))` in the handler.

**Fix C — drop the custom protocol entirely (simplest, most future-proof):** add
`window.api.readImageData(filePath)` to [`src/preload.js`](../../src/preload.js) (preload has `fs`) that
returns an `ArrayBuffer`/`Uint8Array`, and have `createFileDownloadObservable.js` use it instead of XHR.
Trade-off: lose mid-download progress (the bar would jump 0→100); for local disk reads that's fine.
This removes `registerSchemesAsPrivileged` + `protocol.handle` and a whole class of scheme/CSP problems.

## Verify the fix

`yarn start`, browse `G:\Pictures` and a subfolder (`Maui 2025`) — thumbnails should render; open a
single image; then re-check the rest of the manual parity pass (second window, **delete → Recycle Bin**).
Add a small test if practical (e.g. unit-test the new `readImageData`/MIME mapping). Then `yarn package`
and confirm in the packaged build (prod uses `file://`, dev uses the Vite server — protocol behavior can
differ between them, so test both).
