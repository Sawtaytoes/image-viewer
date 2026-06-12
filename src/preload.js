import fs from "node:fs"
import path from "node:path"
import {
  contextBridge,
  ipcRenderer,
  webFrame,
} from "electron"

import { createFakeFileSystem } from "./fakeFileSystem"
import getImageMimeType from "./imageMimeTypes"

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

const fakeFileSystem = isFakeFileSystem
  ? createFakeFileSystem({ path })
  : null

// Surface Pro / high-DPI tablets are scaled up; shrink the UI to fit more on
// screen. Ported from the previous GitHub line (was in renderer.js, which can
// no longer import `electron` under contextIsolation).
webFrame.setZoomFactor(0.75)

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
// `modifiedTime` (epoch ms) rides along so the renderer can offer a
// sort-by-date-modified view; it needs a `stat` per entry (the `Dirent` from
// `readdir` doesn't carry mtime), run in parallel. An unreadable entry
// (permission, broken symlink) keeps `modifiedTime: 0` so it sorts last rather
// than failing the whole listing.
const readDirectory = (directoryPath) =>
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

          try {
            modifiedTime = (
              await fs.promises.stat(filePath)
            ).mtimeMs
          } catch {
            modifiedTime = 0
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
  createNewWindow: (payload) =>
    ipcRenderer.send("createNewWindow", payload),
  // In fake mode the delete is virtual (mutates the in-memory tree, never the
  // disk and never the trash); otherwise it goes to main's trash/rm handler.
  deleteFilePath: fakeFileSystem
    ? fakeFileSystem.deleteFilePath
    : (payload) =>
        ipcRenderer.invoke("deleteFilePath", payload),
  getWindowsDrives: fakeFileSystem
    ? fakeFileSystem.getWindowsDrives
    : () => ipcRenderer.sendSync("get-windows-drives"),
  readDirectory: fakeFileSystem
    ? fakeFileSystem.readDirectory
    : readDirectory,
  readImageData: fakeFileSystem
    ? fakeFileSystem.readImageData
    : readImageData,
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
