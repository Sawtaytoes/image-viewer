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

const createWindow = ({
  filePath,
  displayId,
  inheritFullScreen = false,
  inheritMaximized = false,
  spawnedViewer = false,
} = {}) => {
  // When spawned onto a chosen display, fill that monitor's work area. Otherwise
  // keep the original placement: the right half of the primary display's work
  // area (so the app sits beside whatever launched it).
  const targetDisplay =
    displayId != null
      ? screen
          .getAllDisplays()
          .find((display) => display.id === displayId)
      : null

  let bounds

  if (targetDisplay) {
    const { x, y, width, height } = targetDisplay.workArea

    bounds = { height, width, x, y }
  } else {
    const { width, height } =
      screen.getPrimaryDisplay().workAreaSize

    bounds = {
      height,
      width: Math.floor(width / 2),
      x: Math.floor(width / 2) - 8,
      y: 0,
    }
  }

  const mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundThrottling: true,
    // Custom title bar: hide the OS one and render our own strip (see TitleBar),
    // but keep the native window buttons via the overlay so min/max/close (and
    // Windows Snap Layouts) still work. `height` must match TITLE_BAR_HEIGHT in
    // the renderer so our content clears the overlay. NOTE: `titleBarOverlay`
    // draws native controls on Windows/macOS only — on Linux the window is
    // frameless with no controls, so a future Linux build needs custom buttons.
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#2b2b2b",
      height: 40,
      symbolColor: "#fafafa",
    },
    height: bounds.height,
    show: false,
    useContentSize: true,
    width: bounds.width,
    x: bounds.x,
    y: bounds.y,
    webPreferences: {
      additionalArguments: [
        ...(filePath ? [`--filePath=${filePath}`] : []),
        ...(spawnedViewer ? ["--spawnedViewer"] : []),
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
    // Match the originating window's presentation so a spawn from a maximized or
    // fullscreen window opens the same way on the target display.
    if (inheritFullScreen) {
      mainWindow.setFullScreen(true)
    } else if (inheritMaximized) {
      mainWindow.maximize()
    } else if (targetDisplay) {
      // Re-assert the target monitor's work area now that the window is realized
      // on it. Same mixed-DPI fix as the identify overlay: the constructor bounds
      // are mapped in the wrong DIP space when the target display's scale factor
      // differs from the primary's, so the window opens too small (only part of
      // the screen); a second `setBounds` once Electron knows the monitor fills it.
      const { x, y, width, height } = targetDisplay.workArea

      mainWindow.setBounds({ height, width, x, y })
    }

    mainWindow.show()
  })

  if (isDevelopment) {
    mainWindow.webContents.openDevTools()
  }

  // Capture the id now — the webContents is gone by the time `closed` fires — so
  // this window's open folders stop counting toward the cross-window "open
  // elsewhere" set when it goes away, freeing those folders for auto-fill again.
  const windowId = mainWindow.webContents.id

  mainWindow.on("closed", () => {
    if (openFolderPathsByWindowId.delete(windowId)) {
      broadcastOpenFolders()
    }
  })

  // Mirror OS fullscreen state back to the renderer so the title bar's toggle
  // icon and auto-hide follow whatever flips it — the button, F11, or the
  // inherited state a spawned window opens with — not just our own IPC call.
  const sendFullScreenState = () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "window:fullScreenChanged",
        mainWindow.isFullScreen(),
      )
    }
  }

  mainWindow.on("enter-full-screen", sendFullScreenState)
  mainWindow.on("leave-full-screen", sendFullScreenState)
}

// Fullscreen is owned by the OS/main so F11 and the title-bar button stay in
// sync; the renderer toggles through here and learns the resulting state both
// from this return value and the enter/leave events forwarded in createWindow.
ipcMain.handle("window:toggleFullScreen", (event) => {
  const senderWindow = BrowserWindow.fromWebContents(
    event.sender,
  )

  if (!senderWindow) {
    return false
  }

  const nextIsFullScreen = !senderWindow.isFullScreen()

  senderWindow.setFullScreen(nextIsFullScreen)

  return nextIsFullScreen
})

ipcMain.handle("window:isFullScreen", (event) =>
  Boolean(
    BrowserWindow.fromWebContents(
      event.sender,
    )?.isFullScreen(),
  ),
)

// Synchronous bridge for the drive list (consumed at renderer module-load time).
ipcMain.on("get-windows-drives", (event) => {
  event.returnValue = getWindowsDrives()
})

// Session-only "resume where I left off" memory, keyed by folder path so it's
// shared across every window (queue ids are per-window and can't address a
// shared store). In-memory in main: it survives across windows for one app run
// but isn't persisted to disk. Last-one-wins — whoever lands a new index for a
// path overwrites the single stored value.
const folderLastIndexByPath = new Map()

ipcMain.handle("get-folder-last-index", (_event, path) =>
  folderLastIndexByPath.has(path)
    ? folderLastIndexByPath.get(path)
    : null,
)

ipcMain.on(
  "set-folder-last-index",
  (_event, path, index) => {
    folderLastIndexByPath.set(path, index)
  },
)

// Open another window: either pointed at a file/folder (Ctrl/Shift+click, etc.)
// or spawned onto a chosen display sharing the live queue (spawnedViewer). The
// new window inherits the originating window's fullscreen/maximized state so a
// spawn from a maximized window opens maximized on the target display too.
ipcMain.on("createNewWindow", (event, data = {}) => {
  const originWindow = BrowserWindow.fromWebContents(
    event.sender,
  )

  createWindow({
    ...data,
    inheritFullScreen: Boolean(
      originWindow?.isFullScreen(),
    ),
    inheritMaximized: Boolean(originWindow?.isMaximized()),
  })
})

// Cross-window folder queue. The queue — the folders lined up to view — is the
// persistent, shared thing; panes/columns stay per-window in each renderer. Like
// folderLastIndexByPath above it lives in main so every window sees one list, but
// this one also *broadcasts* every change so open windows stay in sync live. Ids
// are minted by whichever renderer first queues a path (passed in on `queue:add`)
// and kept canonical here, so a pane's `folderId` resolves the same in every
// window. In-memory and session-only: the live queue itself isn't auto-saved —
// the user explicitly saves/loads a single snapshot from the title bar (see the
// "saved slot" handlers below), so a fresh launch starts empty until they load.
let queuedFolders = []

const broadcastQueue = () => {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    browserWindow.webContents.send(
      "queue:changed",
      queuedFolders,
    )
  }
}

// The saved queue "slot": a single snapshot the user writes with "Save for
// later" and brings back with "Load queue" from the title bar. Distinct from the
// live queue above — it persists only on an explicit save and only returns on an
// explicit load. Lives in userData (resolved lazily; app paths aren't available
// until the app is ready).
const savedQueueFilePath = () =>
  path.join(app.getPath("userData"), "saved-queue.json")

const hasSavedQueue = () => {
  try {
    return fs.existsSync(savedQueueFilePath())
  } catch {
    return false
  }
}

// Tell every window whether a saved slot now exists, so each can enable/disable
// its "Load queue" button live (a save in one window lights it up in all).
const broadcastSavedQueueState = () => {
  const isSaved = hasSavedQueue()

  for (const browserWindow of BrowserWindow.getAllWindows()) {
    browserWindow.webContents.send(
      "queue:savedChanged",
      isSaved,
    )
  }
}

// Write the current live queue to the slot; returns whether it stuck.
ipcMain.handle("queue:save", () => {
  try {
    fs.writeFileSync(
      savedQueueFilePath(),
      JSON.stringify(queuedFolders),
    )

    broadcastSavedQueueState()

    return true
  } catch {
    return false
  }
})

// Replace the live queue with the saved slot and broadcast, so every window's
// mirror (and its panes) reconciles to the loaded list. Returns the loaded queue
// (or the untouched current one if there's no readable slot).
ipcMain.handle("queue:load", () => {
  try {
    const raw = fs.readFileSync(
      savedQueueFilePath(),
      "utf8",
    )
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      queuedFolders = parsed

      broadcastQueue()
    }
  } catch {
    // No slot yet (or unreadable/corrupt) — leave the live queue as-is.
  }

  return queuedFolders
})

ipcMain.handle("queue:hasSaved", () => hasSavedQueue())

// A new window hydrates its mirror from this.
ipcMain.handle("queue:get", () => queuedFolders)

// Append one folder unless its path is already queued; return the resulting
// record (existing or new) so the caller can reference its canonical id.
ipcMain.handle("queue:add", (_event, folder) => {
  const existing = queuedFolders.find(
    (queued) => queued.path === folder.path,
  )

  if (existing) {
    return existing
  }

  queuedFolders = [...queuedFolders, folder]

  broadcastQueue()

  return folder
})

// Batch add, deduped by path; returns the full resulting queue.
ipcMain.handle("queue:addMany", (_event, folders) => {
  const queuedPaths = new Set(
    queuedFolders.map((queued) => queued.path),
  )

  const added = []

  for (const folder of folders) {
    if (queuedPaths.has(folder.path)) {
      continue
    }

    queuedPaths.add(folder.path)
    added.push(folder)
  }

  if (added.length > 0) {
    queuedFolders = [...queuedFolders, ...added]

    broadcastQueue()
  }

  return queuedFolders
})

ipcMain.on("queue:remove", (_event, folderId) => {
  const next = queuedFolders.filter(
    (folder) => folder.id !== folderId,
  )

  if (next.length !== queuedFolders.length) {
    queuedFolders = next

    broadcastQueue()
  }
})

ipcMain.on("queue:clear", () => {
  if (queuedFolders.length > 0) {
    queuedFolders = []

    broadcastQueue()
  }
})

// Which folder *paths* each window currently has open in a pane, keyed by the
// window's webContents id. Lets a newly spawned window — or a new column in any
// window — auto-fill the next queued folder that isn't already open in ANY window
// (the cross-window version of skipping folders open in other columns). Cleaned
// up when a window closes (see `createWindow`).
const openFolderPathsByWindowId = new Map()

// Tell every window which paths are open in the *other* windows (never its own),
// so each can exclude those when auto-filling a fresh column/window.
const broadcastOpenFolders = () => {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    const selfId = browserWindow.webContents.id

    const openElsewhere = new Set()

    for (const [
      windowId,
      paths,
    ] of openFolderPathsByWindowId) {
      if (windowId === selfId) {
        continue
      }

      for (const folderPath of paths) {
        openElsewhere.add(folderPath)
      }
    }

    browserWindow.webContents.send("openFolders:changed", [
      ...openElsewhere,
    ])
  }
}

// A window hydrates the "open in other windows" set from this on mount (paths
// open anywhere except the caller).
ipcMain.handle("get-open-folders", (event) => {
  const selfId = event.sender.id

  const openElsewhere = new Set()

  for (const [
    windowId,
    paths,
  ] of openFolderPathsByWindowId) {
    if (windowId === selfId) {
      continue
    }

    for (const folderPath of paths) {
      openElsewhere.add(folderPath)
    }
  }

  return [...openElsewhere]
})

// A window reports the folder paths it currently has open whenever its panes
// change.
ipcMain.on("set-open-folders", (event, paths) => {
  openFolderPathsByWindowId.set(event.sender.id, paths)

  broadcastOpenFolders()
})

// Enumerate connected displays for the "spawn window on another screen" menu.
// `resolutionLabel` uses the rotation-aware logical bounds, so a portrait monitor
// reads 1080×1920.
const describeDisplays = () => {
  const primaryId = screen.getPrimaryDisplay().id

  return screen.getAllDisplays().map((display, index) => ({
    bounds: display.bounds,
    id: display.id,
    isPrimary: display.id === primaryId,
    label: display.label || `Display ${index + 1}`,
    resolutionLabel: `${display.bounds.width}×${display.bounds.height}`,
    workArea: display.workArea,
  }))
}

ipcMain.handle("get-displays", () => describeDisplays())

// A single transient, click-through overlay window that "identifies" a physical
// monitor while the user hovers a row in the spawn-window menu, so they know which
// screen they're about to target (like the OS "Identify displays" affordance).
// Frameless, always-on-top, non-focusable, and ignores mouse events so it never
// steals focus or clicks.
let identifyOverlayWindow = null

const destroyIdentifyOverlay = () => {
  if (
    identifyOverlayWindow &&
    !identifyOverlayWindow.isDestroyed()
  ) {
    identifyOverlayWindow.destroy()
  }

  identifyOverlayWindow = null
}

const showIdentifyOverlay = (displayId) => {
  const display = screen
    .getAllDisplays()
    .find((candidate) => candidate.id === displayId)

  if (!display) {
    return
  }

  destroyIdentifyOverlay()

  const { x, y, width, height } = display.bounds

  identifyOverlayWindow = new BrowserWindow({
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    focusable: false,
    frame: false,
    hasShadow: false,
    height,
    // Resizable so the post-show `setBounds` below can re-assert the exact rect
    // (a non-resizable window ignores programmatic resizes on Windows). The
    // overlay is click-through and non-focusable, so the user still can't resize
    // it.
    resizable: true,
    show: false,
    skipTaskbar: true,
    transparent: true,
    width,
    x,
    y,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  identifyOverlayWindow.setIgnoreMouseEvents(true)

  const label = display.label || "This display"
  const resolution = `${display.bounds.width}×${display.bounds.height}`

  const overlayHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;height:100%;overflow:hidden;font-family:sans-serif;}
    .frame{box-sizing:border-box;height:100vh;width:100vw;
      border:12px solid rgba(42,111,151,0.9);background:rgba(42,111,151,0.18);
      display:flex;align-items:center;justify-content:center;}
    .badge{background:rgba(0,0,0,0.72);color:#fff;border-radius:18px;
      padding:28px 44px;text-align:center;}
    .name{font-size:56px;font-weight:600;}
    .res{font-size:34px;font-weight:300;margin-top:8px;opacity:0.85;}
  </style></head><body><div class="frame"><div class="badge">
    <div class="name">${label}</div><div class="res">${resolution}</div>
  </div></div></body></html>`

  identifyOverlayWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(overlayHtml)}`,
  )

  identifyOverlayWindow.once("ready-to-show", () => {
    if (
      !identifyOverlayWindow ||
      identifyOverlayWindow.isDestroyed()
    ) {
      return
    }

    // Re-assert the exact rectangle now that the window is realized on the target
    // monitor. On a mixed-DPI setup (e.g. a 1080×1920 portrait screen at a
    // different scale factor than the primary) the constructor bounds are mapped
    // in the wrong DIP space and the overlay only partly fills the screen; a
    // second `setBounds` once Electron knows which monitor it's on fixes the fit.
    identifyOverlayWindow.setBounds({ height, width, x, y })

    // showInactive so the overlay never takes focus from the picker.
    identifyOverlayWindow.showInactive()
  })
}

ipcMain.on("identify-display:show", (_event, displayId) => {
  showIdentifyOverlay(displayId)
})

ipcMain.on("identify-display:hide", () => {
  destroyIdentifyOverlay()
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
