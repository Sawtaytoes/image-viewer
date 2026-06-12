// Shared domain types that cross the preload → renderer boundary. Imported by
// both the preload bridge (eventually `preload.ts`) and renderer code, and by
// the `Window.api` augmentation in `preload.d.ts`. This is the single source of
// truth for the shapes `window.api` traffics in — keep it in sync with the real
// preload implementation.

// One entry from `window.api.readDirectory` — the raw shape that crosses the
// IPC bridge. `modifiedTime` is epoch ms (0 when the entry couldn't be stat'd).
export interface DirectoryEntry {
  fileName: string
  filePath: string
  isDirectory: boolean
  isFile: boolean
  modifiedTime: number
}

// A renderer-side image (or folder) reference, derived from `DirectoryEntry`
// by `useImageFiles` / `useDirectories`. `modifiedTime` rides along for the
// sort-by-date view.
export interface ImageFile {
  modifiedTime?: number
  name: string
  path: string
}

// Result of the synchronous `window.api.statPath` probe.
export interface PathStat {
  // `exists` mirrors the preload's `statPath` return shape (and `fs` naming);
  // renaming it to satisfy the is/has boolean convention would churn the whole
  // bridge for no gain.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  exists: boolean
  isDirectory: boolean
  isFile: boolean
}

// Bytes + MIME type returned by `window.api.readImageData`. Named `ImageBytes`
// rather than `ImageData` to avoid colliding with the lib.dom `ImageData`
// global.
export interface ImageBytes {
  data: ArrayBuffer
  mimeType: string
}
