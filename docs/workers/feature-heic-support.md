# Worker brief: HEIC/HEIF image support

- **Report (user):** "I also noticed HEIC photos aren't showing up."
- **Priority:** independent feature; not a quick fix. Pairs with nothing, but iPhone libraries are
  mostly HEIC, so it's high-value for real use.

## Why they don't show (two reasons)

1. **Filtered out at listing time.** `.heic`/`.heif` aren't in `validImageExtensions`, so
   [useImageFiles.js](../../src/components/fileBrowser/useImageFiles.js) drops them before they ever
   reach a tile or pane. Their MIME types are likewise absent from
   [imageMimeTypes.js](../../src/imageMimeTypes.js).
2. **Chromium can't decode HEIC/HEIF.** Even if listed, the pipeline ends in an `<img src=blobURL>`
   whose `load` event drives rendering (see
   [imageDomElementLoaderEpic.js](../../src/components/imageLoader/imageDomElementLoaderEpic.js) and
   [createFileDownloadObservable.js](../../src/components/imageLoader/createFileDownloadObservable.js)).
   A HEIC blob never fires `load` in Chromium — it would silently never appear. **So adding the
   extension alone is not enough; the bytes must be transcoded to a browser-renderable format
   (JPEG/PNG/WebP) first.**

## Recommended approach — decode in the main process

The renderer already receives bytes via `window.api.readImageData(filePath)` (implemented in
[main.js](../../src/main.js) / exposed in [preload.js](../../src/preload.js)), which returns
`{ data, mimeType }`. The clean seam is to **transcode HEIC→JPEG inside `readImageData`** and return
JPEG bytes + `image/jpeg`. The renderer pipeline then needs **no changes** beyond the extension list.

Steps:
1. Add `.heic`, `.heif` to `validImageExtensions` ([useImageFiles.js](../../src/components/fileBrowser/useImageFiles.js)).
2. In `readImageData` (main): if the extension is `.heic`/`.heif`, decode to JPEG and return
   `{ data: <jpegBytes>, mimeType: "image/jpeg" }`. Otherwise behave as today.
3. Keep [imageMimeTypes.js](../../src/imageMimeTypes.js) honest — HEIC is transcoded, so the renderer
   sees `image/jpeg`; you don't strictly need a HEIC MIME entry, but document the transcode so the
   "keep in sync with useImageFiles" comment stays true.

### Library options (decide; note tradeoffs)

- **`heic-convert`** (pure JS, wraps `libheif-js` WASM): no native build, easiest to ship, MIT.
  Slower per image (WASM) — fine for the open viewer, possibly slow for a folder full of gallery
  thumbnails. Good first cut.
- **`sharp`** (native, libvips): fast, but HEIF support depends on the prebuilt binary including
  libheif/libde265, and HEVC carries **patent/licensing** considerations — verify the prebuilt covers
  HEIF decode on Windows before committing.
- **`@napi-rs/image`** / platform codecs: alternative native option; verify HEIF decode support.

Recommendation: start with **`heic-convert`** for correctness/simplicity, then optimize if thumbnails
are too slow.

### Performance notes (important for the gallery)

- A folder of HEICs means **many** transcodes for the thumbnail grid. Mitigations:
  - **Cache** transcoded JPEGs on disk (keyed by path+mtime) so re-browsing is instant.
  - Many HEICs embed a **JPEG preview/thumbnail** — extracting that (fast) for tiles and only doing a
    full decode for the opened image would be much cheaper. Worth investigating in `libheif`.
  - The existing priority/standby download queue (`processQueueEpic` etc.) already throttles work;
    make sure transcoding rides that queue (it does, since it's inside `readImageData`) rather than
    blocking the main process all at once.

## Verify

- A folder containing `.heic` files shows tiles and opens them in the viewer (single + columns).
- Orientation: HEIC EXIF orientation is respected (decoders often need `orientation`/`rotate`
  handling — confirm portrait iPhone shots aren't sideways).
- Non-HEIC images are byte-for-byte unaffected (no regression in the existing fast path).

## Status

☐ needs work — pick a decode library, wire it into `readImageData`, add the extensions, then tackle
thumbnail performance (cache or embedded-preview extraction).
