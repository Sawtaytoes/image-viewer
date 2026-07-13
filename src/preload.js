import fs from "node:fs"
import path from "node:path"
import { contextBridge, ipcRenderer } from "electron"

import { createFakeFileSystem } from "./fakeFileSystem"
import getImageMimeType, {
  imageMimeTypesByExtension,
} from "./imageMimeTypes"

// This preload runs with Node access (sandbox:false) while the renderer does
// not. It exposes a single curated, serializable `window.api` so renderer code
// never imports electron/fs/path/process directly. See docs/research/0002.

// Opt-in sandbox: every filesystem method is served from an in-memory tree
// (see fakeFileSystem.js) instead of the disk, so the app — including the
// delete flow — can be exercised without touching real files. The flag arrives
// as a `--fakeFs` launch argument from main (a Vite-bundled preload can't read
// `process.env` reliably, but `process.argv` works — same channel as
// `--filePath`). Off by default; the real-disk paths below are used.
const isFakeFileSystem = process.argv.includes("--fakeFs")

// A window spawned onto another display (from the "Spawn window" menu) carries
// this flag so the renderer boots straight into the viewer with one column
// auto-filled from the shared queue, instead of the file browser. Same launch
// channel as `--filePath`/`--fakeFs`.
const isSpawnedViewer = process.argv.includes(
  "--spawnedViewer",
)

const fakeFileSystem = isFakeFileSystem
  ? createFakeFileSystem({ path })
  : null

// File/folder path the window was launched with (passed via
// `additionalArguments` from main). Replaces the old renderer process.argv +
// remote.getGlobal('processArgs') reads.
const cliFilePath = fakeFileSystem
  ? fakeFileSystem.cliFilePath
  : (
      process.argv.find((arg) =>
        arg.startsWith("--filePath="),
      ) ?? ""
    ).replace("--filePath=", "")

// Synchronous stat used at renderer module-load time to decide whether a launch
// path is a file or a directory. Returns a plain object (no fs.Stats leaks).
const statPath = (targetPath) => {
  try {
    const stats = fs.lstatSync(targetPath)

    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    }
  } catch {
    return {
      exists: false,
      isDirectory: false,
      isFile: false,
    }
  }
}

// Async directory listing, mapped to plain objects so it can cross the bridge.
// Replaces the renderer's bindNodeCallback(fs.readdir) + inline mapping.
//
// `modifiedTime` (epoch ms) rides along so the renderer can offer a
// sort-by-date-modified view, but the `Dirent` from `readdir` doesn't carry
// mtime — getting it costs a `stat` per entry. On large folders that stat storm
// blocks the whole listing from resolving, so the gallery can't show until
// every file is stat'd (it used to appear instantly, then fill in). Only the
// `modifiedDesc` sort needs mtime, so the renderer opts in via
// `withModifiedTime`; the default name sort skips the stats entirely and the
// listing resolves from the single `readdir`. An unreadable entry (permission,
// broken symlink) keeps `modifiedTime: 0` so it sorts last rather than failing
// the whole listing.
const readDirectory = (
  directoryPath,
  { withModifiedTime = false } = {},
) =>
  fs.promises
    .readdir(directoryPath, { withFileTypes: true })
    .then((entries) =>
      Promise.all(
        entries.map(async (entry) => {
          const filePath = path.join(
            directoryPath,
            entry.name,
          )

          let modifiedTime = 0

          if (withModifiedTime) {
            try {
              modifiedTime = (
                await fs.promises.stat(filePath)
              ).mtimeMs
            } catch {
              modifiedTime = 0
            }
          }

          return {
            fileName: entry.name,
            filePath,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            modifiedTime,
          }
        }),
      ),
    )

// Image extensions the renderer can display — the keys of the shared MIME map,
// so this list never drifts from `readImageData`/`useImageFiles`.
const imageExtensions = new Set(
  Object.keys(imageMimeTypesByExtension),
)

// System trees we never descend into when hunting for a folder's thumbnail:
// huge, slow, or permission-protected, and never holding gallery images.
// Mirrors `useDirectories`' hidden-folder list.
const skippedDirectories = new Set([
  "$recycle.bin",
  "$winreagent",
  "ai_recyclebin",
  "config.msi",
  "recovery",
  "system volume information",
  "windows",
])

// Cap how many directories one probe scans so a deep, image-less tree can't
// stall the gallery — far above any real gallery's nesting.
const maxDirectoriesScanned = 600

// Breadth-first hunt for the first image anywhere under `folderPath`. The result
// doubles as both the folder's thumbnail and the "is this a gallery?" test:
// `null` means no images at any depth, so the folder isn't a gallery and can't
// be queued. Bailing on the first hit keeps shallow, image-rich folders cheap;
// the cap bounds the pathological case. Far lighter than `readDirectory`, which
// stats every entry — this only reads names and stops early.
const findFirstImage = async (folderPath) => {
  const queue = [folderPath]

  let scanned = 0

  while (
    queue.length > 0 &&
    scanned < maxDirectoriesScanned
  ) {
    const currentPath = queue.shift()

    scanned += 1

    let entries

    try {
      entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      })
    } catch {
      continue
    }

    const imageNames = []
    const subdirectories = []

    for (const entry of entries) {
      if (
        entry.isFile() &&
        imageExtensions.has(
          path.extname(entry.name).toLowerCase(),
        )
      ) {
        imageNames.push(entry.name)
      } else if (
        entry.isDirectory() &&
        !skippedDirectories.has(entry.name.toLowerCase())
      ) {
        subdirectories.push(
          path.join(currentPath, entry.name),
        )
      }
    }

    if (imageNames.length > 0) {
      // Name-ascending so the thumbnail is stable rather than readdir-order.
      imageNames.sort((left, right) =>
        left.localeCompare(right),
      )

      return {
        name: imageNames[0],
        path: path.join(currentPath, imageNames[0]),
      }
    }

    queue.push(...subdirectories)
  }

  return null
}

// Counts every image under `folderPath` (at any depth), reusing
// `findFirstImage`'s bounded breadth-first walk but without the early bail —
// names only, no per-entry stat, capped the same way so a deep tree can't stall.
// Powers the per-folder image-count badge; callers gate it on visibility so only
// on-screen tiles pay for it.
const countFolderImages = async (folderPath) => {
  const queue = [folderPath]

  let scanned = 0
  let count = 0

  while (
    queue.length > 0 &&
    scanned < maxDirectoriesScanned
  ) {
    const currentPath = queue.shift()

    scanned += 1

    let entries

    try {
      entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (
        entry.isFile() &&
        imageExtensions.has(
          path.extname(entry.name).toLowerCase(),
        )
      ) {
        count += 1
      } else if (
        entry.isDirectory() &&
        !skippedDirectories.has(entry.name.toLowerCase())
      ) {
        queue.push(path.join(currentPath, entry.name))
      }
    }
  }

  return count
}

// Reads an image off disk and hands the renderer the raw bytes (as a
// cloneable ArrayBuffer) plus a MIME type, replacing the old custom-scheme XHR
// fetch. `fs.promises.readFile` returns a Buffer that may be a view into a
// shared pool, so slice out exactly this file's bytes before crossing the
// bridge.
// Extensions Chromium can't decode itself — transcoded to JPEG in main (via
// libheif WASM) rather than read straight off disk. Keep in sync with the HEIC
// handling in main.js / the extension list in useImageFiles.js.
const transcodedImageExtensions = new Set([
  ".heic",
  ".heif",
])

const readImageData = (filePath) => {
  // HEIC/HEIF can't be rendered by Chromium, so hand them to main for a JPEG
  // transcode (cached there by path+mtime). Everything else is read straight
  // off disk here — the fast path, no IPC round-trip.
  if (
    transcodedImageExtensions.has(
      path.extname(filePath).toLowerCase(),
    )
  ) {
    return ipcRenderer.invoke("readHeicAsJpeg", {
      filePath,
    })
  }

  return fs.promises.readFile(filePath).then((buffer) => ({
    data: buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
    mimeType: getImageMimeType(path.extname(filePath)),
  }))
}

contextBridge.exposeInMainWorld("api", {
  cliFilePath,
  countFolderImages: fakeFileSystem
    ? fakeFileSystem.countFolderImages
    : countFolderImages,
  createNewWindow: (payload) =>
    ipcRenderer.send("createNewWindow", payload),
  // Connected displays for the "spawn window on another screen" menu. Always via
  // IPC (even in fake mode — it touches no disk), so the menu reflects the real
  // monitors and spawned windows land on them.
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  // Show/hide the transient "which monitor is this?" overlay while hovering a row
  // in the spawn-window menu.
  identifyDisplay: (displayId) =>
    ipcRenderer.send("identify-display:show", displayId),
  stopIdentifyDisplay: () =>
    ipcRenderer.send("identify-display:hide"),
  // Set on a window spawned onto another display: boot into the viewer with one
  // auto-filled column rather than the file browser.
  isSpawnedViewer,
  // Which folder paths are open in *other* windows, so a fresh column/window
  // auto-fills the next folder not already open anywhere. `get` hydrates on mount,
  // `set` reports this window's open folders, `onChanged` tracks the others.
  openFolders: {
    get: () => ipcRenderer.invoke("get-open-folders"),
    onChanged: (callback) => {
      const listener = (_event, paths) => callback(paths)

      ipcRenderer.on("openFolders:changed", listener)

      return () => {
        ipcRenderer.removeListener(
          "openFolders:changed",
          listener,
        )
      }
    },
    set: (paths) =>
      ipcRenderer.send("set-open-folders", paths),
  },
  // The shared, cross-window folder queue (lives in main; see main.js). Mutations
  // go to main and come back to every window via `onChanged`. Not branched on the
  // fake FS — the queue holds only folder identity and uses no disk, so fake and
  // real windows can even share one queue in `start:fake`.
  queue: {
    add: (folder) =>
      ipcRenderer.invoke("queue:add", folder),
    addMany: (folders) =>
      ipcRenderer.invoke("queue:addMany", folders),
    clear: () => ipcRenderer.send("queue:clear"),
    get: () => ipcRenderer.invoke("queue:get"),
    onChanged: (callback) => {
      const listener = (_event, folders) =>
        callback(folders)

      ipcRenderer.on("queue:changed", listener)

      return () => {
        ipcRenderer.removeListener(
          "queue:changed",
          listener,
        )
      }
    },
    remove: (folderId) =>
      ipcRenderer.send("queue:remove", folderId),
  },
  // In fake mode the delete is virtual (mutates the in-memory tree, never the
  // disk and never the trash); otherwise it goes to main's trash/rm handler.
  deleteFilePath: fakeFileSystem
    ? fakeFileSystem.deleteFilePath
    : (payload) =>
        ipcRenderer.invoke("deleteFilePath", payload),
  findFirstImage: fakeFileSystem
    ? fakeFileSystem.findFirstImage
    : findFirstImage,
  // Session-only "resume where I left off", keyed by folder path and shared
  // across windows (the store lives in main; the fake FS keeps its own renderer
  // map). `get` resolves to the stored index or null; `set` is fire-and-forget.
  getFolderLastIndex: fakeFileSystem
    ? fakeFileSystem.getFolderLastIndex
    : (folderPath) =>
        ipcRenderer.invoke(
          "get-folder-last-index",
          folderPath,
        ),
  getWindowsDrives: fakeFileSystem
    ? fakeFileSystem.getWindowsDrives
    : () => ipcRenderer.sendSync("get-windows-drives"),
  readDirectory: fakeFileSystem
    ? fakeFileSystem.readDirectory
    : readDirectory,
  readImageData: fakeFileSystem
    ? fakeFileSystem.readImageData
    : readImageData,
  setFolderLastIndex: fakeFileSystem
    ? fakeFileSystem.setFolderLastIndex
    : (folderPath, index) =>
        ipcRenderer.send(
          "set-folder-last-index",
          folderPath,
          index,
        ),
  statPath: fakeFileSystem
    ? fakeFileSystem.statPath
    : statPath,
  path: {
    basename: (targetPath) => path.basename(targetPath),
    dirname: (targetPath) => path.dirname(targetPath),
    extname: (targetPath) => path.extname(targetPath),
    join: (...segments) => path.join(...segments),
    resolve: (...segments) => path.resolve(...segments),
    sep: path.sep,
  },
})
