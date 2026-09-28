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

// One hit from `window.api.searchFolders` — a folder, by name and path, with
// no listing behind it yet. Deliberately its own name rather than reusing
// `ImageFile`: a search result is not an image, and the day one of them gains a
// match score or a depth it must not become a field every image carries.
export interface FolderMatch {
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

// A queued folder — the identity record the shared queue traffics in (no image
// data). Ids are minted by whichever renderer first queues a path and kept
// canonical in main, so a pane's `folderId` resolves the same in every window.
export interface QueuedFolder {
  id: string
  name: string
  path: string
}

// One column of the window that saved the queue: which folder it showed (by
// path — ids are minted per session) and the image it was on.
export interface SavedPane {
  currentIndex: number
  folderPath: string | null
}

// The saved queue "slot". `lastIndexByPath` is the "where I left off" image for
// every queued folder, so a tab opened after a load resumes too; `panes` and
// `activePaneIndex` bring back the saving window's columns. A slot written
// before these existed was a bare `QueuedFolder[]`; `normalizeSavedQueue`
// reads it as a queue with no positions and no columns.
export interface SavedQueue {
  activePaneIndex: number | null
  folders: QueuedFolder[]
  lastIndexByPath: Record<string, number>
  panes: SavedPane[]
}

// What a window hands to `queue.save`: everything but the folder list, which
// the shared store owns and fills in itself.
export type SavedQueueLayout = Omit<SavedQueue, "folders">

// A rectangle in the virtual screen space (Electron display bounds/workArea).
export interface DisplayRect {
  height: number
  width: number
  x: number
  y: number
}

// One connected display, from `window.api.getDisplays()` — for the "spawn window
// on another screen" menu. `resolutionLabel` is rotation-aware (a portrait
// monitor reads "1080×1920").
export interface Display {
  bounds: DisplayRect
  id: number
  isPrimary: boolean
  label: string
  resolutionLabel: string
  workArea: DisplayRect
}

// Bytes + MIME type returned by `window.api.readImageData`. Named `ImageBytes`
// rather than `ImageData` to avoid colliding with the lib.dom `ImageData`
// global.
export interface ImageBytes {
  data: ArrayBuffer
  mimeType: string
}
