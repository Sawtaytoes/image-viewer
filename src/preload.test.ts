// @vitest-environment node
import type { EventEmitter } from "node:events"
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

// The preload's `window.api` against a real temporary folder. Electron is
// replaced by a recorder: `contextBridge` hands the test the object the
// renderer would get, and `ipcRenderer` records what goes to main.

const electron = vi.hoisted(() => ({
  exposedApis: new Map<string, unknown>(),
  invoke: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  send: vi.fn(),
}))

vi.mock("electron", async () => {
  const { EventEmitter: Emitter } = await import(
    "node:events"
  )
  const ipcEvents = new Emitter()

  return {
    contextBridge: {
      exposeInMainWorld: (name: string, api: unknown) => {
        electron.exposedApis.set(name, api)
      },
    },
    ipcRenderer: {
      emit: ipcEvents.emit.bind(ipcEvents),
      invoke: electron.invoke,
      listenerCount:
        ipcEvents.listenerCount.bind(ipcEvents),
      on: ipcEvents.on.bind(ipcEvents),
      removeListener:
        ipcEvents.removeListener.bind(ipcEvents),
      send: electron.send,
      sendSync: vi.fn(),
    },
  }
})

let api: Window["api"]
let ipcRendererEvents: EventEmitter
let workPath = ""

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
    path.join(os.tmpdir(), "image-viewer-preload-"),
  )

  electron.exposedApis.clear()
  electron.invoke.mockReset()
  electron.send.mockReset()

  vi.resetModules()
  await import("./preload")

  api = electron.exposedApis.get("api") as Window["api"]
  ipcRendererEvents = (await import("electron"))
    .ipcRenderer as unknown as EventEmitter
})

afterEach(() => {
  fs.rmSync(workPath, { force: true, recursive: true })
})

describe("statPath", () => {
  test("describes a file, a folder, and a missing path", () => {
    const filePath = writeFile("one.jpg")

    expect(api.statPath(filePath)).toEqual({
      exists: true,
      isDirectory: false,
      isFile: true,
    })
    expect(api.statPath(workPath)).toEqual({
      exists: true,
      isDirectory: true,
      isFile: false,
    })
    expect(
      api.statPath(path.join(workPath, "missing")),
    ).toEqual({
      exists: false,
      isDirectory: false,
      isFile: false,
    })
  })
})

describe("readDirectory", () => {
  test("lists entries as plain objects, with no stat unless asked", async () => {
    writeFile("one.jpg")
    fs.mkdirSync(path.join(workPath, "album"))

    const entries = await api.readDirectory(workPath)

    expect(
      entries.sort((left, right) =>
        left.fileName.localeCompare(right.fileName),
      ),
    ).toEqual([
      {
        fileName: "album",
        filePath: path.join(workPath, "album"),
        isDirectory: true,
        isFile: false,
        modifiedTime: 0,
      },
      {
        fileName: "one.jpg",
        filePath: path.join(workPath, "one.jpg"),
        isDirectory: false,
        isFile: true,
        modifiedTime: 0,
      },
    ])
  })

  test("adds each entry's modified time when asked", async () => {
    const filePath = writeFile("one.jpg")
    const modifiedTime = new Date("2024-05-06T07:08:09Z")

    fs.utimesSync(filePath, modifiedTime, modifiedTime)

    const [entry] = await api.readDirectory(workPath, {
      withModifiedTime: true,
    })

    expect(entry?.modifiedTime).toBe(modifiedTime.getTime())
  })

  test("rejects a folder that does not exist", async () => {
    await expect(
      api.readDirectory(path.join(workPath, "missing")),
    ).rejects.toThrow("ENOENT")
  })
})

describe("findFirstImage", () => {
  test("finds the first image by name at the shallowest depth", async () => {
    writeFile("album/deep/a.jpg")
    writeFile("album/b.png")
    writeFile("album/a.webp")
    writeFile("album/notes.txt")

    await expect(
      api.findFirstImage(path.join(workPath, "album")),
    ).resolves.toEqual({
      name: "a.webp",
      path: path.join(workPath, "album", "a.webp"),
    })
  })

  test("looks inside subfolders but skips system folders", async () => {
    writeFile("album/$RECYCLE.BIN/deleted.jpg")
    writeFile("album/inner/kept.jpg")

    await expect(
      api.findFirstImage(path.join(workPath, "album")),
    ).resolves.toEqual({
      name: "kept.jpg",
      path: path.join(
        workPath,
        "album",
        "inner",
        "kept.jpg",
      ),
    })
  })

  test("returns null for a folder with no images", async () => {
    writeFile("album/notes.txt")

    await expect(
      api.findFirstImage(path.join(workPath, "album")),
    ).resolves.toBeNull()
  })
})

describe("countFolderImages", () => {
  test("counts images at every depth, outside system folders", async () => {
    writeFile("album/a.jpg")
    writeFile("album/inner/b.HEIC")
    writeFile("album/inner/notes.txt")
    writeFile("album/System Volume Information/c.jpg")

    await expect(
      api.countFolderImages(path.join(workPath, "album")),
    ).resolves.toBe(2)
  })
})

describe("searchFolders", () => {
  test("finds folders by name at every depth, nearest first, and streams each level", async () => {
    fs.mkdirSync(
      path.join(workPath, "Trip 2023/day trip"),
      {
        recursive: true,
      },
    )
    fs.mkdirSync(path.join(workPath, "Cats"))
    writeFile("trip notes.txt")

    const batches: string[][] = []

    const matches = await api.searchFolders(
      workPath,
      "  TRIP ",
      (batch) => {
        batches.push(batch.map(({ name }) => name))
      },
    )

    expect(matches).toEqual([
      {
        name: "Trip 2023",
        path: path.join(workPath, "Trip 2023"),
      },
      {
        name: "day trip",
        path: path.join(workPath, "Trip 2023", "day trip"),
      },
    ])
    expect(batches).toEqual([["Trip 2023"], ["day trip"]])
  })

  test("finds nothing for an empty query", async () => {
    fs.mkdirSync(path.join(workPath, "Cats"))

    await expect(
      api.searchFolders(workPath, "   "),
    ).resolves.toEqual([])
  })
})

describe("watchDirectory", () => {
  test("calls back once a burst of changes settles, until unsubscribed", async () => {
    const onChange = vi.fn()
    const unsubscribe = api.watchDirectory(
      workPath,
      onChange,
    )

    writeFile("one.jpg")
    writeFile("two.jpg")

    await vi.waitFor(
      () => {
        expect(onChange).toHaveBeenCalledTimes(1)
      },
      { timeout: 3000 },
    )

    unsubscribe()
    writeFile("three.jpg")

    await new Promise((resolve) => {
      setTimeout(resolve, 600)
    })

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("returns a no-op unsubscribe for a folder it cannot watch", () => {
    const unsubscribe = api.watchDirectory(
      path.join(workPath, "missing"),
      () => {},
    )

    expect(unsubscribe).not.toThrow()
  })
})

describe("readImageData", () => {
  test("reads the bytes off disk with their MIME type and reports progress", async () => {
    const filePath = writeFile("one.png", "png bytes")
    const onProgress = vi.fn()

    const imageBytes = await api.readImageData(
      filePath,
      onProgress,
    )

    expect(Buffer.from(imageBytes.data).toString()).toBe(
      "png bytes",
    )
    expect(imageBytes.data.byteLength).toBe(9)
    expect(imageBytes.mimeType).toBe("image/png")
    expect(onProgress).toHaveBeenLastCalledWith(100)
    expect(electron.invoke).not.toHaveBeenCalled()
  })

  test("stops a read that is canceled", async () => {
    const filePath = writeFile("one.png", "png bytes")

    const reading = api.readImageData(
      filePath,
      undefined,
      "read-1",
    )

    api.cancelReadImageData("read-1")

    await expect(reading).rejects.toMatchObject({
      name: "AbortError",
    })
  })

  test("ignores a cancel after the read has settled", async () => {
    const filePath = writeFile("one.png", "png bytes")

    await api.readImageData(filePath, undefined, "read-1")

    expect(() => {
      api.cancelReadImageData("read-1")
    }).not.toThrow()
  })

  test("sends HEIC to main for a JPEG transcode", async () => {
    const jpeg = {
      data: new Uint8Array([0xff, 0xd8]).buffer,
      mimeType: "image/jpeg",
    }

    electron.invoke.mockResolvedValue(jpeg)

    await expect(
      api.readImageData(
        "/photos/one.HEIC",
        undefined,
        "read-1",
      ),
    ).resolves.toEqual(jpeg)
    expect(electron.invoke).toHaveBeenCalledWith(
      "readHeicAsJpeg",
      { filePath: "/photos/one.HEIC", requestId: "read-1" },
    )
  })

  test("tells main when a HEIC read is canceled, and rejects when main drops it", async () => {
    let answerMain: (value: null) => void = () => {}

    electron.invoke.mockReturnValue(
      new Promise((resolve) => {
        answerMain = resolve
      }),
    )

    const reading = api.readImageData(
      "/photos/one.heif",
      undefined,
      "read-1",
    )

    api.cancelReadImageData("read-1")

    expect(electron.send).toHaveBeenCalledWith(
      "readHeicAsJpeg:cancel",
      "read-1",
    )

    answerMain(null)

    await expect(reading).rejects.toMatchObject({
      name: "AbortError",
    })
  })
})

describe("deleteItems", () => {
  test("passes on progress for its own job only, and stops listening when the job ends", async () => {
    let finishJob: (value: unknown) => void = () => {}

    electron.invoke.mockReturnValue(
      new Promise((resolve) => {
        finishJob = resolve
      }),
    )

    const onProgress = vi.fn()
    const targets = [
      { filePath: "/photos/one.jpg", isDirectory: false },
    ]
    const job = api.deleteItems.start(
      { jobId: "job-1", targets },
      onProgress,
    )

    expect(electron.invoke).toHaveBeenCalledWith(
      "delete:start",
      { jobId: "job-1", targets },
    )

    ipcRendererEvents.emit("delete:progress", {}, "job-2", {
      itemIndex: 0,
    })
    ipcRendererEvents.emit("delete:progress", {}, "job-1", {
      itemIndex: 1,
    })

    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledWith({
      itemIndex: 1,
    })

    finishJob({ isStopped: false, items: [] })
    await job

    expect(
      ipcRendererEvents.listenerCount("delete:progress"),
    ).toBe(0)
  })
})
