import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  app,
  BrowserWindow,
  type Event,
  ipcMain,
  nativeTheme,
  type Rectangle,
  screen,
  shell,
  utilityProcess,
  type WebContents,
  type WebContentsDidStartNavigationEventParams,
} from "electron"
import started from "electron-squirrel-startup"

import {
  runDeleteJob,
  summarizeDeleteTargets,
} from "./deleting/deleteItems"
import {
  nodeDeleteFileSystem,
  toSafeDeleteTargets,
} from "./deleting/nodeDeleteFileSystem"
import getDriveRoots from "./driveRoots"
import {
  createHeicDecodeQueue,
  heicCanceledErrorName,
  isHeicDecodeReply,
} from "./heicDecoding/heicDecodeQueue"
import normalizeSavedQueue from "./savedQueue"
import type {
  QueuedFolder,
  SavedQueueLayout,
} from "./types"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

// Electron names the settings folder after `productName`. The label was
// `Image-Viewer` until 2026-10-23, so pin the folder to that name or every
// install would start over with an empty saved queue under `Image Viewer`.
app.setPath(
  "userData",
  path.join(app.getPath("appData"), "Image-Viewer"),
)

const isDevelopment = !app.isPackaged

// Opt-in in-memory sandbox (see fakeFileSystem.ts / preload.ts). Detected here
// in the main process — where `process.env` reliably reflects the real OS
// environment (same as IMAGE_VIEWER_DEFAULT_DIRECTORY) — and forwarded to the
// preload via `additionalArguments`, because a Vite-bundled preload can't read
// `process.env` at runtime. Launch it with `pnpm start:fake`.
const isFakeFileSystem = Boolean(
  process.env.IMAGE_VIEWER_FAKE_FS,
)

// Two knobs for the fake filesystem's delete, so the progress dialog can be
// seen and screenshotted: a pause per removed entry (the fake tree otherwise
// deletes within one tick), and a trash that always refuses, which sends every
// item down the permanent-delete path as a network share would.
const fakeDeleteArguments = isFakeFileSystem
  ? [
      ...(process.env.IMAGE_VIEWER_FAKE_DELETE_DELAY_MS
        ? [
            `--fakeDeleteDelayMs=${process.env.IMAGE_VIEWER_FAKE_DELETE_DELAY_MS}`,
          ]
        : []),
      ...(process.env.IMAGE_VIEWER_FAKE_TRASH_UNAVAILABLE
        ? ["--fakeTrashUnavailable"]
        : []),
    ]
  : []

// In development, load key=value pairs from the project-root `.env` into
// process.env (without overriding anything already set). Production reads real
// OS environment variables instead, so this dev-only loader keeps the two paths
// reading from the same `process.env` source. Minimal on purpose — no quotes/
// multiline/expansion handling beyond stripping surrounding quotes.
const loadDotEnv = () => {
  if (!isDevelopment) {
    return
  }

  let envFileContents: string

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

// The home screen's tiles: drive letters on Windows; the root, the home folder
// and the mounted volumes on macOS and Linux (see driveRoots.ts).
const listChildDirectories = (directoryPath: string) => {
  try {
    return fs
      .readdirSync(directoryPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directoryPath, entry.name))
  } catch {
    return []
  }
}

const readDriveRoots = () =>
  getDriveRoots({
    homeDirectory: app.getPath("home"),
    isExistingPath: fs.existsSync,
    listChildDirectories,
    platform: process.platform,
    userName: os.userInfo().username,
  })

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

// What the renderer may ask for when it opens a window (`createNewWindow`).
interface NewWindowRequest {
  displayId?: number
  filePath?: string
  // The IPC payload field the renderer sends; see `createNewWindow` in
  // windowApi.d.ts.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  spawnedViewer?: boolean
}

interface CreateWindowOptions extends NewWindowRequest {
  isFullScreenInherited?: boolean
  isMaximizedInherited?: boolean
}

const createWindow = ({
  filePath,
  displayId,
  isFullScreenInherited = false,
  isMaximizedInherited = false,
  spawnedViewer: isSpawnedViewer = false,
}: CreateWindowOptions = {}) => {
  // When spawned onto a chosen display, fill that monitor's work area. Otherwise
  // keep the original placement: the right half of the primary display's work
  // area (so the app sits beside whatever launched it).
  const targetDisplay =
    displayId != null
      ? screen
          .getAllDisplays()
          .find((display) => display.id === displayId)
      : null

  let bounds: Rectangle

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
    // Windows and macOS take the window icon from the executable and the app
    // bundle. Linux takes it from the window, so pass the PNG Forge generated
    // (see forge.config.ts): beside the app once packaged, `build/` in dev.
    ...(process.platform === "linux"
      ? {
          icon: app.isPackaged
            ? path.join(process.resourcesPath, "icon.png")
            : path.join(
                app.getAppPath(),
                "build",
                "icon.png",
              ),
        }
      : {}),
    // Custom title bar: hide the OS one and render our own strip (see TitleBar),
    // but keep the native window buttons via the overlay so min/max/close (and
    // Windows Snap Layouts) still work. `height` must match TITLE_BAR_HEIGHT in
    // the renderer so our content clears the overlay. Electron draws the
    // controls on the right on Windows and Linux; macOS keeps its traffic lights
    // on the left, centered in the 40px strip by `trafficLightPosition` (the
    // buttons are 12px tall, so y 14 puts their middle at 20), and TitleBar
    // moves its gutter to that side.
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 14, y: 14 },
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
      // This was a top-level window option, where Electron ignores it. It
      // belongs here, and `true` is also Electron's default.
      backgroundThrottling: true,
      additionalArguments: [
        ...(filePath ? [`--filePath=${filePath}`] : []),
        ...(isSpawnedViewer ? ["--spawnedViewer"] : []),
        ...(isFakeFileSystem ? ["--fakeFs"] : []),
        ...fakeDeleteArguments,
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
    if (isFullScreenInherited) {
      mainWindow.setFullScreen(true)
    } else if (isMaximizedInherited) {
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

  const isFullScreenNext = !senderWindow.isFullScreen()

  senderWindow.setFullScreen(isFullScreenNext)

  return isFullScreenNext
})

ipcMain.handle("window:isFullScreen", (event) =>
  Boolean(
    BrowserWindow.fromWebContents(
      event.sender,
    )?.isFullScreen(),
  ),
)

// Synchronous bridge for the drive list (consumed at renderer module-load time).
ipcMain.on("get-drive-roots", (event) => {
  event.returnValue = readDriveRoots()
})

// The OS colour scheme, owned by the main process. This is the whole reason the
// colour-scheme switcher works in this app: the renderer runs with
// `contextIsolation` on and no Node access, so it has no reliable read of the OS
// `prefers-color-scheme` — but `nativeTheme` in main does. `nativeTheme.themeSource`
// is left at its default `"system"` (we only *read* the OS answer, never override
// it), so `shouldUseDarkColors` is the live OS truth. The renderer's
// `@charcuterie/logic` colour-scheme resolver is bridged onto these two channels
// (see preload's `colorScheme`): a synchronous read for `resolver.get()` and the
// `updated` broadcast for `resolver.subscribe()`.
ipcMain.on("get-native-theme", (event) => {
  event.returnValue = nativeTheme.shouldUseDarkColors
    ? "dark"
    : "light"
})

// The OS flipped light/dark (or high-contrast) — tell every open window so each
// renderer following `system` re-resolves live, no restart.
nativeTheme.on("updated", () => {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    if (!browserWindow.isDestroyed()) {
      browserWindow.webContents.send("native-theme-updated")
    }
  }
})

// Session-only "resume where I left off" memory, keyed by folder path so it's
// shared across every window (queue ids are per-window and can't address a
// shared store). In-memory in main: it survives across windows for one app run
// but isn't persisted to disk. Last-one-wins — whoever lands a new index for a
// path overwrites the single stored value.
const folderLastIndexByPath = new Map<string, number>()

ipcMain.handle(
  "get-folder-last-index",
  (_event, folderPath: string) =>
    folderLastIndexByPath.get(folderPath) ?? null,
)

ipcMain.on(
  "set-folder-last-index",
  (_event, folderPath: string, index: number) => {
    folderLastIndexByPath.set(folderPath, index)
  },
)

// Open another window: either pointed at a file/folder (Ctrl/Shift+click, etc.)
// or spawned onto a chosen display sharing the live queue (spawnedViewer). The
// new window inherits the originating window's fullscreen/maximized state so a
// spawn from a maximized window opens maximized on the target display too.
ipcMain.on(
  "createNewWindow",
  (event, data: NewWindowRequest = {}) => {
    const originWindow = BrowserWindow.fromWebContents(
      event.sender,
    )

    createWindow({
      ...data,
      isFullScreenInherited: Boolean(
        originWindow?.isFullScreen(),
      ),
      isMaximizedInherited: Boolean(
        originWindow?.isMaximized(),
      ),
    })
  },
)

// Cross-window folder queue. The queue — the folders lined up to view — is the
// persistent, shared thing; panes/columns stay per-window in each renderer. Like
// folderLastIndexByPath above it lives in main so every window sees one list, but
// this one also *broadcasts* every change so open windows stay in sync live. Ids
// are minted by whichever renderer first queues a path (passed in on `queue:add`)
// and kept canonical here, so a pane's `folderId` resolves the same in every
// window. In-memory and session-only: the live queue itself isn't auto-saved —
// the user explicitly saves/loads a single snapshot from the title bar (see the
// "saved slot" handlers below), so a fresh launch starts empty until they load.
let queuedFolders: QueuedFolder[] = []

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

// Write the current live queue to the slot, with the saving window's layout
// (its columns and the "where I left off" image of every queued folder), so a
// load brings the reading positions back too. The folder list is always main's
// own — the canonical queue — never the renderer's mirror of it. Returns
// whether it stuck.
ipcMain.handle(
  "queue:save",
  (_event, layout: Partial<SavedQueueLayout> = {}) => {
    try {
      fs.writeFileSync(
        savedQueueFilePath(),
        JSON.stringify(
          normalizeSavedQueue({
            ...layout,
            folders: queuedFolders,
          }),
        ),
      )

      broadcastSavedQueueState()

      return true
    } catch {
      return false
    }
  },
)

// Replace the live queue with the saved slot and broadcast, so every window's
// mirror (and its panes) reconciles to the loaded list. The saved positions go
// back into the shared "where I left off" store, so any folder opened from the
// loaded queue — in any window — resumes where it was. Returns the whole slot
// so the loading window can rebuild its columns, or null when there is no
// readable slot (the live queue is then left as it was).
ipcMain.handle("queue:load", () => {
  let saved = null

  try {
    saved = normalizeSavedQueue(
      JSON.parse(
        fs.readFileSync(savedQueueFilePath(), "utf8"),
      ),
    )
  } catch {
    // No slot yet, or unreadable/corrupt.
  }

  if (!saved) {
    return null
  }

  for (const [folderPath, index] of Object.entries(
    saved.lastIndexByPath,
  )) {
    folderLastIndexByPath.set(folderPath, index)
  }

  queuedFolders = saved.folders

  broadcastQueue()

  return saved
})

ipcMain.handle("queue:hasSaved", () => hasSavedQueue())

// Delete the saved slot entirely (the live queue is untouched) and broadcast, so
// "Load queue"/"Delete saved" disable across every window. Best-effort remove;
// the broadcast reports the real on-disk state either way.
ipcMain.handle("queue:clearSaved", () => {
  try {
    fs.rmSync(savedQueueFilePath(), { force: true })
  } catch {
    // Leave the file as-is; broadcastSavedQueueState() still reports the truth.
  }

  broadcastSavedQueueState()
})

// A new window hydrates its mirror from this.
ipcMain.handle("queue:get", () => queuedFolders)

// Append one folder unless its path is already queued; return the resulting
// record (existing or new) so the caller can reference its canonical id.
ipcMain.handle(
  "queue:add",
  (_event, folder: QueuedFolder) => {
    const existing = queuedFolders.find(
      (queued) => queued.path === folder.path,
    )

    if (existing) {
      return existing
    }

    queuedFolders = [...queuedFolders, folder]

    broadcastQueue()

    return folder
  },
)

// Batch add, deduped by path; returns the full resulting queue.
ipcMain.handle(
  "queue:addMany",
  (_event, folders: QueuedFolder[]) => {
    const queuedPaths = new Set(
      queuedFolders.map((queued) => queued.path),
    )

    const added: QueuedFolder[] = []

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
  },
)

ipcMain.on("queue:remove", (_event, folderId: string) => {
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
const openFolderPathsByWindowId = new Map<
  number,
  string[]
>()

// Tell every window which paths are open in the *other* windows (never its own),
// so each can exclude those when auto-filling a fresh column/window.
const broadcastOpenFolders = () => {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    const selfId = browserWindow.webContents.id

    const openElsewhere = new Set<string>()

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

  const openElsewhere = new Set<string>()

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
ipcMain.on("set-open-folders", (event, paths: string[]) => {
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
let identifyOverlayWindow: BrowserWindow | null = null

const destroyIdentifyOverlay = () => {
  if (
    identifyOverlayWindow &&
    !identifyOverlayWindow.isDestroyed()
  ) {
    identifyOverlayWindow.destroy()
  }

  identifyOverlayWindow = null
}

const showIdentifyOverlay = (displayId: number) => {
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

ipcMain.on(
  "identify-display:show",
  (_event, displayId: number) => {
    showIdentifyOverlay(displayId)
  },
)

ipcMain.on("identify-display:hide", () => {
  destroyIdentifyOverlay()
})

// Delete files and folders: each goes to the OS trash, and falls back to a
// permanent delete when the trash refuses it (a network share, a full Recycle
// Bin). The fallback is intentional and asks no second question. See
// docs/decisions/2026-11-13-delete-shows-what-it-removes-with-progress-and-a-stop-button.md.
//
// `shell.moveItemToTrash` was removed in Electron 13; `shell.trashItem` is the
// replacement. The work lives in `src/deleting/deleteItems.ts`, which removes
// one entry at a time with promises, so this process never blocks on a large
// folder and the renderer gets progress as it goes.
const trashItem = (filePath: string) =>
  shell.trashItem(filePath)

// Running delete jobs, by the id the renderer chose, so Stop can find them.
const deleteJobAbortControllersById = new Map<
  string,
  AbortController
>()

ipcMain.handle(
  "delete:summarize",
  (_event, targets: unknown) =>
    summarizeDeleteTargets({
      fileSystem: nodeDeleteFileSystem,
      targets: toSafeDeleteTargets(targets),
    }),
)

ipcMain.handle(
  "delete:start",
  async (
    event,
    { jobId, targets }: { jobId: string; targets: unknown },
  ) => {
    const safeTargets = toSafeDeleteTargets(targets)
    const abortController = new AbortController()
    const sender = event.sender

    // A window that closes, reloads ([Ctrl][R]), or crashes mid-delete loses
    // its dialog, so nothing could show progress or offer Stop any more. Its
    // delete stops after the current entry. A hash-route change is a
    // same-document navigation and keeps the page, so it does not stop it.
    const stopWhenWindowCloses = () => {
      abortController.abort()
    }

    const stopWhenPageIsReplaced = (
      details: Event<WebContentsDidStartNavigationEventParams>,
    ) => {
      if (details.isMainFrame && !details.isSameDocument) {
        abortController.abort()
      }
    }

    deleteJobAbortControllersById.set(
      jobId,
      abortController,
    )

    sender.once("destroyed", stopWhenWindowCloses)
    sender.on("render-process-gone", stopWhenWindowCloses)
    sender.on(
      "did-start-navigation",
      stopWhenPageIsReplaced,
    )

    try {
      return await runDeleteJob({
        fileSystem: nodeDeleteFileSystem,
        onProgress: (progress) => {
          if (!sender.isDestroyed()) {
            sender.send("delete:progress", jobId, progress)
          }
        },
        signal: abortController.signal,
        targets: safeTargets,
        trashItem,
      })
    } finally {
      deleteJobAbortControllersById.delete(jobId)

      if (!sender.isDestroyed()) {
        sender.removeListener(
          "destroyed",
          stopWhenWindowCloses,
        )
        sender.removeListener(
          "render-process-gone",
          stopWhenWindowCloses,
        )
        sender.removeListener(
          "did-start-navigation",
          stopWhenPageIsReplaced,
        )
      }
    }
  },
)

ipcMain.on("delete:stop", (_event, jobId: string) => {
  deleteJobAbortControllersById.get(jobId)?.abort()
})

// The original single-item channel, kept for its contract: trash, then the
// permanent fallback, resolving to whether the item is gone. The app's own
// delete buttons use the `delete:*` channels above for progress and Stop.
ipcMain.handle(
  "deleteFilePath",
  async (
    _event,
    {
      filePath,
      isDirectory,
    }: { filePath: string; isDirectory?: boolean },
  ) => {
    try {
      const { items } = await runDeleteJob({
        fileSystem: nodeDeleteFileSystem,
        signal: new AbortController().signal,
        targets: toSafeDeleteTargets([
          { filePath, isDirectory },
        ]),
        trashItem,
      })

      const [item] = items

      if (
        item?.outcome !== "movedToTrash" &&
        item?.outcome !== "deletedPermanently"
      ) {
        console.error(
          "Failed to delete",
          filePath,
          item?.trashErrorMessage,
          item?.errorMessage,
        )

        return false
      }

      return true
    } catch (error) {
      console.error("Failed to delete", filePath, error)

      return false
    }
  },
)

// HEIC/HEIF decode. Chromium can't render HEIC, so iPhone photos never fire an
// <img> load event and silently stay blank. The preload's `readImageData`
// routes only `.heic`/`.heif` here and gets JPEG bytes back; every other format
// stays on the fast preload `fs` path untouched. The decode is slow,
// synchronous WASM, so it runs in a utility process, one image at a time, and
// this process only queues, caches, and cancels (see
// src/heicDecoding/heicDecodeQueue.ts). The worker starts on the first HEIC
// request, so it never slows startup. See docs/workers/feature-heic-support.md.
const heicDecodeQueue = createHeicDecodeQueue({
  getModifiedTime: async (filePath) =>
    (await fs.promises.stat(filePath)).mtimeMs,
  spawnWorker: ({ onExit, onReply }) => {
    const worker = utilityProcess.fork(
      path.join(__dirname, "heicDecodeWorker.js"),
      [],
      { serviceName: "Image Viewer HEIC decoder" },
    )

    worker.on("message", (message: unknown) => {
      if (isHeicDecodeReply(message)) {
        onReply(message)
      }
    })
    worker.once("exit", onExit)

    return {
      kill: () => {
        worker.kill()
      },
      postMessage: (request) => {
        worker.postMessage(request)
      },
    }
  },
})

// The HEIC requests each window still waits on. A window that closes,
// reloads, or crashes cannot show those images any more, so its requests are
// canceled. A hash-route change keeps the page, so it cancels nothing.
const heicRequestIdsBySender = new Map<
  WebContents,
  Set<string>
>()

const trackHeicRequestsOf = (sender: WebContents) => {
  const trackedRequestIds =
    heicRequestIdsBySender.get(sender)

  if (trackedRequestIds) {
    return trackedRequestIds
  }

  const requestIds = new Set<string>()

  const cancelAllRequests = () => {
    for (const requestId of requestIds) {
      heicDecodeQueue.cancel(requestId)
    }

    requestIds.clear()
  }

  heicRequestIdsBySender.set(sender, requestIds)

  sender.once("destroyed", () => {
    cancelAllRequests()
    heicRequestIdsBySender.delete(sender)
  })
  sender.on("render-process-gone", cancelAllRequests)
  sender.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) {
      cancelAllRequests()
    }
  })

  return requestIds
}

// Request ids are the renderer's, unique within its window, so the queue's id
// adds the window. A caller with no id still decodes; it just cannot cancel.
let nextAnonymousHeicRequestNumber = 1

const toHeicQueueRequestId = (
  sender: WebContents,
  requestId: string,
) => `${sender.id}:${requestId}`

ipcMain.handle(
  "readHeicAsJpeg",
  async (
    event,
    {
      filePath,
      requestId,
    }: { filePath: string; requestId?: string },
  ) => {
    const queueRequestId = toHeicQueueRequestId(
      event.sender,
      requestId ??
        `anonymous-${nextAnonymousHeicRequestNumber++}`,
    )
    const requestIds = trackHeicRequestsOf(event.sender)

    requestIds.add(queueRequestId)

    try {
      return await heicDecodeQueue.decode({
        filePath,
        requestId: queueRequestId,
      })
    } catch (error) {
      // A canceled read is routine (the image scrolled away), and Electron
      // logs every handler that throws. Null tells the preload it was
      // canceled.
      if (
        error instanceof Error &&
        error.name === heicCanceledErrorName
      ) {
        return null
      }

      throw error
    } finally {
      requestIds.delete(queueRequestId)
    }
  },
)

// The image is no longer shown: drop its decode if nobody else waits for it.
ipcMain.on(
  "readHeicAsJpeg:cancel",
  (event, requestId: string) => {
    heicDecodeQueue.cancel(
      toHeicQueueRequestId(event.sender, requestId),
    )
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
