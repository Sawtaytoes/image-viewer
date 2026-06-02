import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import {
  app,
  BrowserWindow,
  ipcMain,
  net,
  protocol,
  screen,
  shell,
} from "electron"
import started from "electron-squirrel-startup"

const PROTOCOL_NAME = "safe-file-protocol"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

// A privileged custom scheme lets the renderer load local images by URL
// (safe-file-protocol://<path>) without Node access. Must be registered before
// the app is ready. Kept non-standard so the opaque Windows path survives.
protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_NAME,
    privileges: {
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
])

const isDevelopment = !app.isPackaged

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
// Explorer). Flags and the dev "." placeholder are passed through unchanged so
// the renderer can apply its own fallbacks.
const getLaunchFilePath = () => {
  const launchArg = process.argv[1]

  if (!launchArg || launchArg.startsWith("--")) {
    return ""
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
  protocol.handle(PROTOCOL_NAME, (request) => {
    const encodedPath = request.url.slice(
      `${PROTOCOL_NAME}://`.length,
    )
    const filePath = decodeURIComponent(encodedPath)

    return net.fetch(pathToFileURL(filePath).toString())
  })

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
