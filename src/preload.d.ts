// Types the `window.api` bridge that `preload.js` exposes via
// `contextBridge.exposeInMainWorld`, so every renderer `window.api.*` call site
// is checked without a cast. The shapes mirror `src/preload.js`; the domain
// payloads live in `src/types.ts`.

import type {
  DirectoryEntry,
  Display,
  ImageBytes,
  ImageFile,
  PathStat,
  QueuedFolder,
} from "./types"

declare global {
  interface Window {
    api: {
      // File/folder path the window was launched with ("" when none).
      cliFilePath: string
      // Total images anywhere under `folderPath` (bounded breadth-first walk),
      // for the per-folder image-count badge.
      countFolderImages: (
        folderPath: string,
      ) => Promise<number>
      // Open another window: pointed at a file/folder, or spawned onto a display
      // (`displayId`) sharing the live queue (`spawnedViewer`).
      createNewWindow: (payload: {
        filePath?: string
        displayId?: number
        // The IPC payload field main reads to boot the new window into the
        // viewer; renaming it to satisfy the is/has convention would churn the
        // whole spawn path for no gain.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        spawnedViewer?: boolean
      }) => void
      // Connected displays for the "spawn window on another screen" menu.
      getDisplays: () => Promise<Display[]>
      // Show/hide the transient "which monitor is this?" identify overlay.
      identifyDisplay: (displayId: number) => void
      stopIdentifyDisplay: () => void
      // True when this window was spawned onto another display — boot straight
      // into the viewer with one auto-filled column.
      isSpawnedViewer: boolean
      // The shared, cross-window folder queue (canonical store in main).
      queue: {
        add: (folder: QueuedFolder) => Promise<QueuedFolder>
        addMany: (
          folders: QueuedFolder[],
        ) => Promise<QueuedFolder[]>
        clear: () => void
        get: () => Promise<QueuedFolder[]>
        // Subscribe to queue changes (from any window); returns an unsubscribe.
        onChanged: (
          callback: (folders: QueuedFolder[]) => void,
        ) => () => void
        remove: (folderId: string) => void
      }
      // Trash a file or folder (resolves to whether it was removed).
      deleteFilePath: (payload: {
        filePath: string
        isDirectory?: boolean
      }) => Promise<boolean>
      // The first image anywhere under `folderPath` (breadth-first), or null
      // when the folder holds no images at any depth — i.e. isn't a gallery.
      // Doubles as a folder's thumbnail source.
      findFirstImage: (
        folderPath: string,
      ) => Promise<ImageFile | null>
      // Session-only "resume where I left off" index for a folder path, shared
      // across windows. Resolves to the stored index, or null when none.
      getFolderLastIndex: (
        folderPath: string,
      ) => Promise<number | null>
      // Available Windows drive roots (e.g. ["C:\\", "G:\\"]).
      getWindowsDrives: () => string[]
      // `withModifiedTime` opts into a `stat` per entry for `modifiedTime`
      // (needed only by the date-modified sort); the default name sort skips it
      // so large folders list instantly.
      readDirectory: (
        directoryPath: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention -- matches the preload's runtime option name
        options?: { withModifiedTime?: boolean },
      ) => Promise<DirectoryEntry[]>
      readImageData: (
        filePath: string,
      ) => Promise<ImageBytes>
      // Record the last-viewed image index for a folder path (session-only,
      // shared across windows; last write wins).
      setFolderLastIndex: (
        folderPath: string,
        index: number,
      ) => void
      statPath: (targetPath: string) => PathStat
      path: {
        basename: (targetPath: string) => string
        dirname: (targetPath: string) => string
        extname: (targetPath: string) => string
        join: (...segments: string[]) => string
        resolve: (...segments: string[]) => string
        sep: string
      }
    }
  }
}
