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
      additionalArguments: filePath
        ? [`--filePath=${filePath}`]
        : [],
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

app.whenReady().then(() => {
  // Images are read off disk through the preload bridge
  // (window.api.readImageData), so no custom protocol registration is needed.
  createWindow({ filePath: getLaunchFilePath() })
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
