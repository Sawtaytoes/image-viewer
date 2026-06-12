// Types the `window.api` bridge that `preload.js` exposes via
// `contextBridge.exposeInMainWorld`, so every renderer `window.api.*` call site
// is checked without a cast. The shapes mirror `src/preload.js`; the domain
// payloads live in `src/types.ts`.

import type {
  DirectoryEntry,
  ImageBytes,
  PathStat,
} from "./types"

declare global {
  interface Window {
    api: {
      // File/folder path the window was launched with ("" when none).
      cliFilePath: string
      // Open another window pointed at a file or folder.
      createNewWindow: (payload: {
        filePath: string
      }) => void
      // Trash a file or folder (resolves to whether it was removed).
      deleteFilePath: (payload: {
        filePath: string
        isDirectory?: boolean
      }) => Promise<boolean>
      // Available Windows drive roots (e.g. ["C:\\", "G:\\"]).
      getWindowsDrives: () => string[]
      readDirectory: (
        directoryPath: string,
      ) => Promise<DirectoryEntry[]>
      readImageData: (
        filePath: string,
      ) => Promise<ImageBytes>
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
