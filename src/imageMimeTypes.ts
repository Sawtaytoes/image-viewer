// MIME types for the image extensions the browser can render. preload's
// `readImageData` tags the bytes with one of these so the renderer can build a
// correctly-typed Blob. Mirrors the extension list in
// src/components/fileBrowser/useImageFiles.js — keep the two in sync.
//
// HEIC/HEIF are the exception: Chromium can't decode them, so main transcodes
// them to JPEG and the renderer only ever sees `image/jpeg` for those — the
// entries below are documentation of the source format, not a Blob type the
// renderer uses.
const imageMimeTypesByExtension: Record<string, string> = {
  ".apng": "image/apng",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".cur": "image/x-icon",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".ico": "image/x-icon",
  ".jfif": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pjp": "image/jpeg",
  ".pjpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
}

// Browsers sniff image bytes regardless of the Blob type, so the fallback is
// only a sensible default for an unrecognized extension.
const getImageMimeType = (extension: string): string =>
  imageMimeTypesByExtension[extension.toLowerCase()] ??
  "application/octet-stream"

export { getImageMimeType, imageMimeTypesByExtension }

export default getImageMimeType
