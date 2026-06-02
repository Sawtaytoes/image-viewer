import fs from "node:fs"
import path from "node:path"
import { contextBridge, ipcRenderer } from "electron"

// This preload runs with Node access (sandbox:false) while the renderer does
// not. It exposes a single curated, serializable `window.api` so renderer code
// never imports electron/fs/path/process directly. See docs/research/0002.

// File/folder path the window was launched with (passed via
// `additionalArguments` from main). Replaces the old renderer process.argv +
// remote.getGlobal('processArgs') reads.
const cliFilePath = (
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
const readDirectory = (directoryPath) =>
  fs.promises
    .readdir(directoryPath, { withFileTypes: true })
    .then((entries) =>
      entries.map((entry) => ({
        fileName: entry.name,
        filePath: path.join(directoryPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      })),
    )

contextBridge.exposeInMainWorld("api", {
  cliFilePath,
  createNewWindow: (payload) =>
    ipcRenderer.send("createNewWindow", payload),
  deleteFilePath: (payload) =>
    ipcRenderer.invoke("deleteFilePath", payload),
  getWindowsDrives: () =>
    ipcRenderer.sendSync("get-windows-drives"),
  readDirectory,
  statPath,
  path: {
    basename: (targetPath) => path.basename(targetPath),
    dirname: (targetPath) => path.dirname(targetPath),
    extname: (targetPath) => path.extname(targetPath),
    join: (...segments) => path.join(...segments),
    resolve: (...segments) => path.resolve(...segments),
    sep: path.sep,
  },
})
