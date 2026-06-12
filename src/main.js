import fs from "node:fs"
import path from "node:path"
import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  shell,
} from "electron"
import started from "electron-squirrel-startup"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const isDevelopment = !app.isPackaged

// Opt-in in-memory sandbox (see fakeFileSystem.js / preload.js). Detected here
// in the main process — where `process.env` reliably reflects the real OS
// environment (same as IMAGE_VIEWER_DEFAULT_DIRECTORY) — and forwarded to the
// preload via `additionalArguments`, because a Vite-bundled preload can't read
// `process.env` at runtime. Launch it with `yarn start:fake`.
const isFakeFileSystem = Boolean(
  process.env.IMAGE_VIEWER_FAKE_FS,
)

// In development, load key=value pairs from the project-root `.env` into
// process.env (without overriding anything already set). Production reads real
// OS environment variables instead, so this dev-only loader keeps the two paths
// reading from the same `process.env` source. Minimal on purpose — no quotes/
// multiline/expansion handling beyond stripping surrounding quotes.
const loadDotEnv = () => {
  if (!isDevelopment) {
    return
  }

  let envFileContents

  try {
    envFileContents = fs.readFileSync(
      path.join(process.cwd(), ".env"),
      "utf8",
    )
  } catch {
    // No `.env` file is fine — fall back to the OS environment.
    return
  }

  for (const line of envFileContents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*([\w.-]+)\s*=\s*(.*?)\s*$/,
    )

    if (!match || line.trimStart().startsWith("#")) {
      continue
    }

    const [, key, rawValue] = match

    const value =
      (rawValue.startsWith('"') &&
        rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadDotEnv()

// The directory the file browser opens to when the app is launched without an
// explicit file/folder. Configure it via the IMAGE_VIEWER_DEFAULT_DIRECTORY
// environment variable: in development put it in `.env`; in production set it as
// an OS user-level environment variable (Windows GUI apps inherit those). When
// unset, the renderer falls back to the drive list.
const getDefaultDirectory = () =>
  process.env.IMAGE_VIEWER_DEFAULT_DIRECTORY ?? ""

// Enumerate available Windows drive letters without spawning a shell. The old
// `wmic logicaldisk` call is removed on modern Windows 11; probing A:..Z: with
// fs.existsSync is instant and reliable. See docs/research/0006.
const getWindowsDrives = () => {
  if (process.platform !== "win32") {
    return []
  }

  const drives = []

  for (let charCode = 65; charCode <= 90; charCode++) {
    const driveRoot = `${String.fromCharCode(charCode)}:\\`

    if (fs.existsSync(driveRoot)) {
      drives.push(driveRoot)
    }
  }

  return drives
}

// The file/folder path the app was launched with (e.g. "Open with" from
// Explorer). When there's no real launch path — nothing passed, a CLI flag, or
// the dev "." placeholder — fall back to the configured default directory.
const getLaunchFilePath = () => {
  const launchArg = process.argv[1]

  if (
    !launchArg ||
    launchArg === "." ||
    launchArg.startsWith("--")
  ) {
    return getDefaultDirectory()
  }

  return launchArg
}

const createWindow = ({ filePath } = {}) => {
  const mainDisplay = screen.getPrimaryDisplay()
  const { width, height } = mainDisplay.workAreaSize

  const mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundThrottling: true,
    height,
    show: false,
    useContentSize: true,
    width: Math.floor(width / 2),
    x: Math.floor(width / 2) - 8,
    y: 0,
    webPreferences: {
      additionalArguments: [
        ...(filePath ? [`--filePath=${filePath}`] : []),
        ...(isFakeFileSystem ? ["--fakeFs"] : []),
      ],
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
      ),
    )
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  if (isDevelopment) {
    mainWindow.webContents.openDevTools()
  }
}

// Synchronous bridge for the drive list (consumed at renderer module-load time).
ipcMain.on("get-windows-drives", (event) => {
  event.returnValue = getWindowsDrives()
})

// Open another window pointed at a file or folder (Ctrl/Shift+click, etc.).
ipcMain.on("createNewWindow", (_event, data) => {
  createWindow(data)
})

// Delete a file or folder: send to the OS trash, falling back to a permanent
// delete only if trashing fails. `shell.moveItemToTrash` was removed in
// Electron 13 — `shell.trashItem` is the replacement. See docs/research/0002.
ipcMain.handle(
  "deleteFilePath",
  async (_event, { filePath }) => {
    try {
      await shell.trashItem(filePath)
      return true
    } catch (trashError) {
      try {
        await fs.promises.rm(filePath, {
          force: true,
          recursive: true,
        })
        return true
      } catch (removeError) {
        console.error(
          "Failed to delete",
          filePath,
          trashError,
          removeError,
        )
        return false
      }
    }
  },
)

// HEIC/HEIF decode. Chromium can't render HEIC, so iPhone photos never fire an
// <img> load event and silently stay blank. The renderer's `readImageData`
// routes only `.heic`/`.heif` here and gets JPEG bytes back; every other format
// stays on the fast preload `fs` path untouched. `heic-convert` (libheif WASM)
// is loaded lazily — so it never slows startup — and kept external from the Vite
// bundle (see vite.main.config.ts). Decoded JPEGs are cached by path+mtime, with
// a small LRU bound, so re-browsing a folder of HEICs doesn't re-run the slow
// WASM decode. See docs/workers/feature-heic-support.md.
const heicJpegCacheByKey = new Map()
const heicJpegCacheMaxEntries = 64

let heicConvertModulePromise

const loadHeicConvert = () => {
  if (!heicConvertModulePromise) {
    heicConvertModulePromise = import("heic-convert")
  }

  return heicConvertModulePromise.then(
    (module) => module.default ?? module,
  )
}

ipcMain.handle(
  "readHeicAsJpeg",
  async (_event, { filePath }) => {
    const { mtimeMs } = await fs.promises.stat(filePath)
    const cacheKey = `${filePath}:${mtimeMs}`

    const cachedArrayBuffer =
      heicJpegCacheByKey.get(cacheKey)

    if (cachedArrayBuffer) {
      // Refresh LRU recency (delete + re-set moves it to the newest slot).
      heicJpegCacheByKey.delete(cacheKey)
      heicJpegCacheByKey.set(cacheKey, cachedArrayBuffer)

      return {
        data: cachedArrayBuffer,
        mimeType: "image/jpeg",
      }
    }

    const inputBuffer = await fs.promises.readFile(filePath)
    const convert = await loadHeicConvert()
    const jpegBuffer = await convert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.92,
    })

    // `convert` hands back a Node Buffer that may be a view into a larger pool;
    // slice out exactly this image's bytes as a standalone ArrayBuffer so the
    // structured clone across IPC carries only the JPEG.
    const arrayBuffer = jpegBuffer.buffer.slice(
      jpegBuffer.byteOffset,
      jpegBuffer.byteOffset + jpegBuffer.byteLength,
    )

    heicJpegCacheByKey.set(cacheKey, arrayBuffer)

    if (heicJpegCacheByKey.size > heicJpegCacheMaxEntries) {
      // Evict the least-recently-used entry (Map preserves insertion order).
      const oldestKey = heicJpegCacheByKey
        .keys()
        .next().value
      heicJpegCacheByKey.delete(oldestKey)
    }

    return {
      data: arrayBuffer,
      mimeType: "image/jpeg",
    }
  },
)

app.whenReady().then(() => {
  // Images are read off disk through the preload bridge
  // (window.api.readImageData), so no custom protocol registration is needed.
  // In fake mode the preload owns the launch path (the in-memory root), so don't
  // hand it a real one.
  createWindow({
    filePath: isFakeFileSystem
      ? undefined
      : getLaunchFilePath(),
  })
})

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  // On macOS re-create a window when the dock icon is clicked and none are open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
