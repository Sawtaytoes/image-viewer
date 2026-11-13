// @vitest-environment node
import { EventEmitter } from "node:events"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import type {
  DeleteJobResult,
  DeleteSummary,
} from "./deleting/deleteItems"
import type { HeicDecodeRequest } from "./heicDecoding/heicDecodeQueue"
import type { ImageBytes, SavedQueue } from "./types"

// The main process's IPC handlers that touch the file system, run against a
// real temporary folder. Electron is replaced by a recorder: `ipcMain`
// collects the handlers `main.ts` registers, the trash is a mock (a test must
// never send real files to the trash), and the HEIC utility process is a fake
// the test answers.

type IpcHandler = (
  event: unknown,
  ...args: never[]
) => unknown

const electron = vi.hoisted(() => ({
  fork: vi.fn(),
  handlers: new Map<string, IpcHandler>(),
  listeners: new Map<string, IpcHandler>(),
  paths: new Map<string, string>(),
  trashItem: vi.fn<(filePath: string) => Promise<void>>(),
  windows: [] as {
    isDestroyed: () => boolean
    webContents: {
      id: number
      send: (...args: unknown[]) => void
    }
  }[],
}))

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      electron.paths.get(name) ?? "",
    isPackaged: true,
    on: () => {},
    quit: () => {},
    setPath: (name: string, value: string) => {
      electron.paths.set(name, value)
    },
    // No window opens in these tests.
    whenReady: () => new Promise(() => {}),
  },
  BrowserWindow: {
    fromWebContents: () => null,
    getAllWindows: () => electron.windows,
  },
  ipcMain: {
    handle: (channel: string, handler: IpcHandler) => {
      electron.handlers.set(channel, handler)
    },
    on: (channel: string, listener: IpcHandler) => {
      electron.listeners.set(channel, listener)
    },
  },
  nativeTheme: { on: () => {}, shouldUseDarkColors: false },
  screen: {},
  shell: { trashItem: electron.trashItem },
  utilityProcess: { fork: electron.fork },
}))

vi.mock("electron-squirrel-startup", () => ({
  default: false,
}))

// A window's `webContents`: `send` records what main tells it, and the
// lifecycle events can be emitted by hand.
class FakeWebContents extends EventEmitter {
  id: number
  isGone = false
  send = vi.fn()

  constructor(id: number) {
    super()
    this.id = id
  }

  isDestroyed() {
    return this.isGone
  }
}

// The HEIC worker's utility process.
class FakeUtilityProcess extends EventEmitter {
  isKilled = false
  requests: HeicDecodeRequest[] = []

  kill() {
    this.isKilled = true
    queueMicrotask(() => {
      this.emit("exit", 0)
    })
  }

  postMessage(request: HeicDecodeRequest) {
    this.requests.push(request)
  }
}

let workPath = ""
let userDataPath = ""
let sender = new FakeWebContents(1)

// Like `ipcRenderer.invoke`: a handler that throws becomes a rejection.
const invoke = async <Result>(
  channel: string,
  ...args: unknown[]
): Promise<Result> => {
  const handler = electron.handlers.get(channel)

  if (!handler) {
    throw new Error(`No handler for ${channel}`)
  }

  return (await (
    handler as (...handlerArgs: unknown[]) => unknown
  )({ sender }, ...args)) as Result
}

const send = (channel: string, ...args: unknown[]) => {
  const listener = electron.listeners.get(channel)

  if (!listener) {
    throw new Error(`No listener for ${channel}`)
  }

  const event = {
    returnValue: undefined as unknown,
    sender,
  }

  ;(listener as (...listenerArgs: unknown[]) => unknown)(
    event,
    ...args,
  )

  return event.returnValue
}

const writeFile = (
  relativePath: string,
  contents = "x",
) => {
  const filePath = path.join(workPath, relativePath)

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents)

  return filePath
}

beforeEach(async () => {
  workPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "image-viewer-main-"),
  )

  electron.handlers.clear()
  electron.listeners.clear()
  electron.paths.clear()
  electron.paths.set("appData", workPath)
  electron.paths.set("home", workPath)
  electron.trashItem.mockReset()
  electron.fork.mockReset()

  sender = new FakeWebContents(1)
  electron.windows.length = 0
  electron.windows.push({
    isDestroyed: () => false,
    webContents: sender,
  })

  // A fresh module each test, so the live queue and caches start empty.
  vi.resetModules()
  await import("./main")

  // `main.ts` pins userData to `<appData>/Image-Viewer`.
  userDataPath = electron.paths.get("userData") ?? ""
  fs.mkdirSync(userDataPath, { recursive: true })
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(workPath, { force: true, recursive: true })
})

describe("userData", () => {
  test("keeps the settings folder named Image-Viewer", () => {
    expect(userDataPath).toBe(
      path.join(workPath, "Image-Viewer"),
    )
  })
})

describe("get-drive-roots", () => {
  test.runIf(process.platform === "linux")(
    "lists the root and the home folder on Linux",
    () => {
      const driveRoots = send("get-drive-roots")

      expect(driveRoots).toEqual(
        expect.arrayContaining(["/", workPath]),
      )
    },
  )
})

describe("the saved queue slot", () => {
  const folders = [
    { id: "a", name: "Trip", path: "/photos/Trip" },
    { id: "b", name: "Cats", path: "/photos/Cats" },
  ]

  const savedQueuePath = () =>
    path.join(userDataPath, "saved-queue.json")

  test("has no slot before anything is saved", async () => {
    await expect(invoke("queue:hasSaved")).resolves.toBe(
      false,
    )
  })

  test("saves main's own queue with the saving window's layout, and tells every window", async () => {
    await invoke("queue:addMany", folders)

    const isSaved = await invoke("queue:save", {
      activePaneIndex: 0,
      // The renderer's copy of the folder list is ignored.
      folders: [{ id: "x", name: "Stale", path: "/stale" }],
      lastIndexByPath: { "/photos/Trip": 4 },
      panes: [
        { currentIndex: 4, folderPath: "/photos/Trip" },
      ],
    })

    expect(isSaved).toBe(true)
    expect(
      JSON.parse(fs.readFileSync(savedQueuePath(), "utf8")),
    ).toEqual({
      activePaneIndex: 0,
      folders,
      lastIndexByPath: { "/photos/Trip": 4 },
      panes: [
        { currentIndex: 4, folderPath: "/photos/Trip" },
      ],
    })
    expect(sender.send).toHaveBeenCalledWith(
      "queue:savedChanged",
      true,
    )
    await expect(invoke("queue:hasSaved")).resolves.toBe(
      true,
    )
  })

  test("reports a save that cannot be written", async () => {
    fs.rmSync(userDataPath, {
      force: true,
      recursive: true,
    })

    await expect(invoke("queue:save", {})).resolves.toBe(
      false,
    )
  })

  test("loads the slot into the live queue and the resume store, and broadcasts the queue", async () => {
    const slot: SavedQueue = {
      activePaneIndex: null,
      folders,
      lastIndexByPath: { "/photos/Cats": 9 },
      panes: [],
    }

    fs.writeFileSync(savedQueuePath(), JSON.stringify(slot))

    await expect(invoke("queue:load")).resolves.toEqual(
      slot,
    )
    await expect(invoke("queue:get")).resolves.toEqual(
      folders,
    )
    await expect(
      invoke("get-folder-last-index", "/photos/Cats"),
    ).resolves.toBe(9)
    expect(sender.send).toHaveBeenCalledWith(
      "queue:changed",
      folders,
    )
  })

  test("loads a slot written as a bare folder list", async () => {
    fs.writeFileSync(
      savedQueuePath(),
      JSON.stringify(folders),
    )

    await expect(invoke("queue:load")).resolves.toEqual({
      activePaneIndex: null,
      folders,
      lastIndexByPath: {},
      panes: [],
    })
  })

  test("keeps the live queue when the slot is corrupt", async () => {
    await invoke("queue:add", folders[0])
    fs.writeFileSync(savedQueuePath(), "{ not json")

    await expect(invoke("queue:load")).resolves.toBeNull()
    await expect(invoke("queue:get")).resolves.toEqual([
      folders[0],
    ])
  })

  test("deletes the slot and tells every window", async () => {
    fs.writeFileSync(
      savedQueuePath(),
      JSON.stringify(folders),
    )

    await invoke("queue:clearSaved")

    expect(fs.existsSync(savedQueuePath())).toBe(false)
    expect(sender.send).toHaveBeenCalledWith(
      "queue:savedChanged",
      false,
    )
  })
})

describe("delete:summarize", () => {
  test("counts the files, folders, and bytes a delete would remove", async () => {
    writeFile("album/one.jpg", "12345")
    writeFile("album/inner/two.jpg", "123")

    const summary = await invoke<DeleteSummary>(
      "delete:summarize",
      [
        {
          filePath: path.join(workPath, "album"),
          isDirectory: true,
        },
      ],
    )

    expect(summary).toMatchObject({
      fileCount: 2,
      folderCount: 1,
      isComplete: true,
      totalBytes: 8,
    })
  })

  test("refuses a relative path or a filesystem root", async () => {
    await expect(
      invoke("delete:summarize", [
        { filePath: "album", isDirectory: true },
      ]),
    ).rejects.toThrow("relative path")
    await expect(
      invoke("delete:summarize", [
        {
          filePath: path.parse(workPath).root,
          isDirectory: true,
        },
      ]),
    ).rejects.toThrow("root")
  })
})

describe("delete:start", () => {
  test("moves each item to the trash first", async () => {
    const filePath = writeFile("one.jpg")

    electron.trashItem.mockResolvedValue(undefined)

    const result = await invoke<DeleteJobResult>(
      "delete:start",
      {
        jobId: "job-1",
        targets: [{ filePath, isDirectory: false }],
      },
    )

    expect(electron.trashItem).toHaveBeenCalledWith(
      filePath,
    )
    expect(result.items[0]?.outcome).toBe("movedToTrash")
  })

  test("deletes permanently when the trash refuses, and reports progress to the asking window", async () => {
    const folderPath = path.dirname(
      writeFile("album/one.jpg"),
    )

    writeFile("album/inner/two.jpg")

    electron.trashItem.mockRejectedValue(
      new Error("No trash on this share"),
    )

    const result = await invoke<DeleteJobResult>(
      "delete:start",
      {
        jobId: "job-1",
        targets: [
          { filePath: folderPath, isDirectory: true },
        ],
      },
    )

    expect(result.items[0]).toMatchObject({
      outcome: "deletedPermanently",
      trashErrorMessage: "No trash on this share",
    })
    expect(fs.existsSync(folderPath)).toBe(false)
    expect(sender.send).toHaveBeenCalledWith(
      "delete:progress",
      "job-1",
      expect.objectContaining({ itemPath: folderPath }),
    )
  })

  test("stops the remaining items on delete:stop", async () => {
    const firstPath = writeFile("one.jpg")
    const secondPath = writeFile("two.jpg")

    electron.trashItem.mockImplementation(() => {
      send("delete:stop", "job-1")

      return Promise.reject(new Error("No trash"))
    })

    const result = await invoke<DeleteJobResult>(
      "delete:start",
      {
        jobId: "job-1",
        targets: [
          { filePath: firstPath, isDirectory: false },
          { filePath: secondPath, isDirectory: false },
        ],
      },
    )

    expect(result.isStopped).toBe(true)
    expect(
      result.items.map(({ outcome }) => outcome),
    ).toEqual(["notDeleted", "notDeleted"])
    expect(fs.existsSync(firstPath)).toBe(true)
    expect(fs.existsSync(secondPath)).toBe(true)
  })

  test("stops when the asking window closes", async () => {
    const filePath = writeFile("one.jpg")

    electron.trashItem.mockImplementation(() => {
      sender.isGone = true
      sender.emit("destroyed")

      return Promise.reject(new Error("No trash"))
    })

    const result = await invoke<DeleteJobResult>(
      "delete:start",
      {
        jobId: "job-1",
        targets: [{ filePath, isDirectory: false }],
      },
    )

    expect(result.isStopped).toBe(true)
    expect(fs.existsSync(filePath)).toBe(true)
  })

  test("stops when the page reloads, but not on a same-document navigation", async () => {
    const keptPath = writeFile("kept.jpg")
    const removedPath = writeFile("removed.jpg")

    electron.trashItem.mockImplementation(() => {
      sender.emit("did-start-navigation", {
        isMainFrame: true,
        isSameDocument: true,
      })

      return Promise.reject(new Error("No trash"))
    })

    const sameDocumentResult =
      await invoke<DeleteJobResult>("delete:start", {
        jobId: "job-1",
        targets: [
          { filePath: removedPath, isDirectory: false },
        ],
      })

    expect(sameDocumentResult.isStopped).toBe(false)
    expect(fs.existsSync(removedPath)).toBe(false)

    electron.trashItem.mockImplementation(() => {
      sender.emit("did-start-navigation", {
        isMainFrame: true,
        isSameDocument: false,
      })

      return Promise.reject(new Error("No trash"))
    })

    const reloadResult = await invoke<DeleteJobResult>(
      "delete:start",
      {
        jobId: "job-2",
        targets: [
          { filePath: keptPath, isDirectory: false },
        ],
      },
    )

    expect(reloadResult.isStopped).toBe(true)
    expect(fs.existsSync(keptPath)).toBe(true)
  })

  test("removes its window listeners when the job ends", async () => {
    const filePath = writeFile("one.jpg")

    electron.trashItem.mockResolvedValue(undefined)

    await invoke("delete:start", {
      jobId: "job-1",
      targets: [{ filePath, isDirectory: false }],
    })

    expect(sender.listenerCount("destroyed")).toBe(0)
    expect(
      sender.listenerCount("render-process-gone"),
    ).toBe(0)
    expect(
      sender.listenerCount("did-start-navigation"),
    ).toBe(0)
  })
})

describe("deleteFilePath", () => {
  test("deletes permanently when the trash refuses, and resolves true", async () => {
    const filePath = writeFile("one.jpg")

    electron.trashItem.mockRejectedValue(
      new Error("No trash"),
    )

    await expect(
      invoke("deleteFilePath", {
        filePath,
        isDirectory: false,
      }),
    ).resolves.toBe(true)
    expect(fs.existsSync(filePath)).toBe(false)
  })

  test("resolves false and touches nothing for a relative path or a root", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      invoke("deleteFilePath", {
        filePath: "one.jpg",
        isDirectory: false,
      }),
    ).resolves.toBe(false)
    await expect(
      invoke("deleteFilePath", {
        filePath: path.parse(workPath).root,
        isDirectory: true,
      }),
    ).resolves.toBe(false)
    expect(electron.trashItem).not.toHaveBeenCalled()
  })
})

describe("readHeicAsJpeg", () => {
  const startFakeWorkers = () => {
    const workers: FakeUtilityProcess[] = []

    electron.fork.mockImplementation(() => {
      const worker = new FakeUtilityProcess()

      workers.push(worker)

      return worker
    })

    return workers
  }

  // The handler stats the real file before it queues the decode.
  const waitForRequestCount = (
    workers: FakeUtilityProcess[],
    count: number,
  ) =>
    vi.waitFor(() => {
      expect(workers[0]?.requests).toHaveLength(count)
    })

  const answer = (
    worker: FakeUtilityProcess | undefined,
    bytes: number[],
  ) => {
    const request = worker?.requests.at(-1)

    if (!worker || !request) {
      throw new Error("No HEIC request to answer.")
    }

    worker.emit("message", {
      data: new Uint8Array(bytes).buffer,
      jobId: request.jobId,
    })
  }

  test("decodes in the HEIC utility process and returns JPEG bytes", async () => {
    const workers = startFakeWorkers()
    const filePath = writeFile("photo.heic")

    const reading = invoke<ImageBytes>("readHeicAsJpeg", {
      filePath,
      requestId: "read-1",
    })

    await waitForRequestCount(workers, 1)

    expect(electron.fork).toHaveBeenCalledWith(
      expect.stringMatching(/heicDecodeWorker\.js$/),
      [],
      expect.any(Object),
    )
    expect(workers[0]?.requests).toEqual([
      { filePath, jobId: 1 },
    ])

    answer(workers[0], [0xff, 0xd8])

    const imageBytes = await reading

    expect(imageBytes.mimeType).toBe("image/jpeg")
    expect([...new Uint8Array(imageBytes.data)]).toEqual([
      0xff, 0xd8,
    ])
  })

  test("serves a second read of an unchanged file from the cache", async () => {
    const workers = startFakeWorkers()
    const filePath = writeFile("photo.heic")

    const reading = invoke("readHeicAsJpeg", { filePath })

    await waitForRequestCount(workers, 1)
    answer(workers[0], [1])
    await reading

    await expect(
      invoke("readHeicAsJpeg", { filePath }),
    ).resolves.toMatchObject({ mimeType: "image/jpeg" })
    expect(workers).toHaveLength(1)
    expect(workers[0]?.requests).toHaveLength(1)
  })

  test("drops a decode the window canceled, and answers null rather than throwing", async () => {
    const workers = startFakeWorkers()
    const filePath = writeFile("photo.heic")

    const reading = invoke("readHeicAsJpeg", {
      filePath,
      requestId: "read-1",
    })

    await waitForRequestCount(workers, 1)
    send("readHeicAsJpeg:cancel", "read-1")

    await expect(reading).resolves.toBeNull()
    expect(workers[0]?.isKilled).toBe(true)
  })

  test("a cancel from another window does not touch this window's read", async () => {
    const workers = startFakeWorkers()
    const filePath = writeFile("photo.heic")

    const reading = invoke<ImageBytes>("readHeicAsJpeg", {
      filePath,
      requestId: "read-1",
    })

    await waitForRequestCount(workers, 1)

    const ownSender = sender

    sender = new FakeWebContents(2)
    send("readHeicAsJpeg:cancel", "read-1")
    sender = ownSender

    expect(workers[0]?.isKilled).toBe(false)

    answer(workers[0], [1])

    await expect(reading).resolves.toMatchObject({
      mimeType: "image/jpeg",
    })
  })

  test("cancels a window's reads when the window closes", async () => {
    const workers = startFakeWorkers()
    const filePath = writeFile("photo.heic")

    const reading = invoke("readHeicAsJpeg", {
      filePath,
      requestId: "read-1",
    })

    await waitForRequestCount(workers, 1)
    sender.isGone = true
    sender.emit("destroyed")

    await expect(reading).resolves.toBeNull()
    expect(workers[0]?.isKilled).toBe(true)
  })

  test("a read from before a reload cannot untrack a newer read that reuses its id", async () => {
    const workers = startFakeWorkers()
    const firstPath = writeFile("first.heic")
    const secondPath = writeFile("second.heic")
    const realStat = fs.promises.stat
    let finishOldStat: () => void = () => {}

    // Hold the old read in its stat until the new read is decoding.
    vi.spyOn(fs.promises, "stat").mockImplementationOnce(
      (filePath) =>
        new Promise((resolve) => {
          finishOldStat = () => {
            resolve(realStat(filePath))
          }
        }),
    )

    const oldRead = invoke("readHeicAsJpeg", {
      filePath: firstPath,
      requestId: "read-1",
    })

    // The page reloads: its reads are canceled, and its counter starts again.
    sender.emit("did-start-navigation", {
      isMainFrame: true,
      isSameDocument: false,
    })

    const newRead = invoke("readHeicAsJpeg", {
      filePath: secondPath,
      requestId: "read-1",
    })

    await waitForRequestCount(workers, 1)

    finishOldStat()

    await expect(oldRead).resolves.toBeNull()

    // The window closes. The newer read must still be tracked, and canceled.
    sender.isGone = true
    sender.emit("destroyed")

    await expect(newRead).resolves.toBeNull()
    expect(workers[0]?.isKilled).toBe(true)
  })

  test("a cancel reaches the newest read with that id", async () => {
    const workers = startFakeWorkers()
    const filePath = writeFile("photo.heic")

    const reading = invoke("readHeicAsJpeg", {
      filePath,
      requestId: "read-1",
    })

    await waitForRequestCount(workers, 1)
    send("readHeicAsJpeg:cancel", "read-1")

    await expect(reading).resolves.toBeNull()

    // After the read settled, the same id cancels nothing.
    expect(() => {
      send("readHeicAsJpeg:cancel", "read-1")
    }).not.toThrow()
  })

  test("rejects a file that does not exist", async () => {
    startFakeWorkers()

    await expect(
      invoke("readHeicAsJpeg", {
        filePath: path.join(workPath, "missing.heic"),
      }),
    ).rejects.toThrow("ENOENT")
    expect(electron.fork).not.toHaveBeenCalled()
  })
})
