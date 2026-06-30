// Types the `window.api` bridge that `preload.js` exposes via
// `contextBridge.exposeInMainWorld`, so every renderer `window.api.*` call site
// is checked without a cast. The shapes mirror `src/preload.js`; the domain
// payloads live in `src/types.ts`.

import type {
  DirectoryEntry,
  ImageBytes,
  ImageFile,
  PathStat,
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
      // Open another window pointed at a file or folder.
      createNewWindow: (payload: {
        filePath: string
      }) => void
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
