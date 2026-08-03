// Types the `window.api` bridge that `preload.js` exposes via
// `contextBridge.exposeInMainWorld`, so every renderer `window.api.*` call site
// is checked without a cast. The shapes mirror `src/preload.js`; the domain
// payloads live in `src/types.ts`.

import type {
  DirectoryEntry,
  Display,
  FolderMatch,
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
      // This window's OS fullscreen state. Main owns the truth (F11 flips it
      // there too), so `get` hydrates on mount, `toggle` resolves to the new
      // state, and `onChanged` tracks every enter/leave however it was
      // triggered (returns an unsubscribe).
      fullScreen: {
        get: () => Promise<boolean>
        onChanged: (
          callback: (isFullScreen: boolean) => void,
        ) => () => void
        toggle: () => Promise<boolean>
      }
      // Connected displays for the "spawn window on another screen" menu.
      getDisplays: () => Promise<Display[]>
      // Show/hide the transient "which monitor is this?" identify overlay.
      identifyDisplay: (displayId: number) => void
      stopIdentifyDisplay: () => void
      // True when this window was spawned onto another display — boot straight
      // into the viewer with one auto-filled column.
      isSpawnedViewer: boolean
      // Folder paths open in *other* windows, for cross-window auto-fill dedupe.
      openFolders: {
        get: () => Promise<string[]>
        // Subscribe to changes in what's open elsewhere; returns an unsubscribe.
        onChanged: (
          callback: (paths: string[]) => void,
        ) => () => void
        set: (paths: string[]) => void
      }
      // The shared, cross-window folder queue (canonical store in main).
      queue: {
        add: (folder: QueuedFolder) => Promise<QueuedFolder>
        addMany: (
          folders: QueuedFolder[],
        ) => Promise<QueuedFolder[]>
        clear: () => void
        get: () => Promise<QueuedFolder[]>
        // Whether a saved slot currently exists (gates the "Load queue"
        // button).
        hasSaved: () => Promise<boolean>
        // Replace the live queue with the saved slot; main broadcasts the
        // change to every window.
        load: () => Promise<QueuedFolder[]>
        // Subscribe to queue changes (from any window); returns an unsubscribe.
        onChanged: (
          callback: (folders: QueuedFolder[]) => void,
        ) => () => void
        // Fires whenever the saved slot appears/changes, so "Load queue" can
        // enable across every window when one of them saves. Returns an
        // unsubscribe.
        onSavedChanged: (
          callback: (isSaved: boolean) => void,
        ) => () => void
        remove: (folderId: string) => void
        // Snapshot the live queue into the saved slot.
        save: () => Promise<boolean>
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
      // Recursive folder-name search under `rootPath` (folders only, every
      // depth, bounded). `onBatch` streams each directory level's matches as
      // they are found; the promise settles on the authoritative full list —
      // which is how the fake FS, that streams nothing, still works.
      searchFolders: (
        rootPath: string,
        query: string,
        onBatch?: (matches: FolderMatch[]) => void,
      ) => Promise<FolderMatch[]>
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
