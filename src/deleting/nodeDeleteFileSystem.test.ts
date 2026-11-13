import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest"

import {
  type DeleteProgress,
  runDeleteJob,
  summarizeDeleteTargets,
} from "./deleteItems"
import {
  nodeDeleteFileSystem,
  toSafeDeleteTargets,
} from "./nodeDeleteFileSystem"

// The real-disk adapter against a real temporary folder: the permanent delete
// the trash falls back to must remove everything, report each entry, stop
// when asked, and never follow a link out of the folder it was given.

let workPath = ""

beforeEach(() => {
  workPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "image-viewer-delete-"),
  )
})

afterEach(() => {
  fs.rmSync(workPath, { force: true, recursive: true })
})

const writeTree = (
  folderPath: string,
  fileCount: number,
) => {
  fs.mkdirSync(path.join(folderPath, "inner"), {
    recursive: true,
  })

  for (let index = 0; index < fileCount; index += 1) {
    fs.writeFileSync(
      path.join(
        folderPath,
        index % 2 === 0 ? "" : "inner",
        `photo-${index}.jpg`,
      ),
      "x".repeat(10),
    )
  }
}

const refuseTrash = () =>
  Promise.reject(new Error("no trash in this test"))

describe("nodeDeleteFileSystem", () => {
  test("summarizes and then permanently deletes a real folder", async () => {
    const folderPath = path.join(workPath, "Album")

    writeTree(folderPath, 20)

    const summary = await summarizeDeleteTargets({
      fileSystem: nodeDeleteFileSystem,
      targets: [
        { filePath: folderPath, isDirectory: true },
      ],
    })

    expect(summary).toMatchObject({
      fileCount: 20,
      folderCount: 1,
      isComplete: true,
      totalBytes: 200,
    })

    const progress: DeleteProgress[] = []

    const result = await runDeleteJob({
      fileSystem: nodeDeleteFileSystem,
      onProgress: (update) => {
        progress.push(update)
      },
      progressIntervalMs: 0,
      signal: new AbortController().signal,
      targets: [
        { filePath: folderPath, isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(fs.existsSync(folderPath)).toBe(false)
    expect(result.items[0]).toMatchObject({
      entriesRemoved: 22,
      entriesTotal: 22,
      outcome: "deletedPermanently",
    })
    expect(progress.at(-1)).toMatchObject({
      entriesDone: 22,
      phase: "removing",
    })
  })

  test("Stop leaves the rest of a real folder on disk", async () => {
    const folderPath = path.join(workPath, "Album")

    writeTree(folderPath, 40)

    const abortController = new AbortController()

    const result = await runDeleteJob({
      fileSystem: nodeDeleteFileSystem,
      onProgress: ({ entriesDone, phase }) => {
        if (phase === "removing" && entriesDone >= 5) {
          abortController.abort()
        }
      },
      progressIntervalMs: 0,
      signal: abortController.signal,
      targets: [
        { filePath: folderPath, isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    const [item] = result.items

    expect(item?.outcome).toBe("partlyDeleted")
    expect(fs.existsSync(folderPath)).toBe(true)

    const remainingFileCount =
      fs.readdirSync(folderPath).length -
      1 +
      fs.readdirSync(path.join(folderPath, "inner")).length

    expect(remainingFileCount).toBe(
      40 - (item?.entriesRemoved ?? 0),
    )
  })

  test("a file written into the folder mid-delete is removed too, not left behind", async () => {
    const folderPath = path.join(workPath, "Album")

    writeTree(folderPath, 6)

    let hasWritten = false

    const result = await runDeleteJob({
      fileSystem: nodeDeleteFileSystem,
      onProgress: ({ phase }) => {
        // The listing is done; a program saves a new file into a subfolder.
        if (phase === "removing" && !hasWritten) {
          hasWritten = true
          fs.writeFileSync(
            path.join(folderPath, "inner", "Thumbs.db"),
            "x",
          )
        }
      },
      progressIntervalMs: 0,
      signal: new AbortController().signal,
      targets: [
        { filePath: folderPath, isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(fs.existsSync(folderPath)).toBe(false)
    expect(result.items[0]).toMatchObject({
      entriesRemoved: 9,
      entriesTotal: 9,
      outcome: "deletedPermanently",
    })
  })

  test("removes a link inside the folder without touching what it points at", async () => {
    const folderPath = path.join(workPath, "Album")
    const outsidePath = path.join(workPath, "Outside")

    writeTree(folderPath, 2)
    writeTree(outsidePath, 4)

    fs.symlinkSync(
      outsidePath,
      path.join(folderPath, "link-to-outside"),
      "dir",
    )

    await runDeleteJob({
      fileSystem: nodeDeleteFileSystem,
      signal: new AbortController().signal,
      targets: [
        { filePath: folderPath, isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(fs.existsSync(folderPath)).toBe(false)
    expect(fs.readdirSync(outsidePath)).toHaveLength(3)
  })

  test("a listed folder swapped for a link mid-delete never lets the delete reach the linked folder", async () => {
    const folderPath = path.join(workPath, "Album")
    const outsidePath = path.join(workPath, "Outside")

    writeTree(folderPath, 6)
    writeTree(outsidePath, 6)

    let isSwapped = false

    const result = await runDeleteJob({
      fileSystem: {
        ...nodeDeleteFileSystem,
        removeFile: async (filePath) => {
          await nodeDeleteFileSystem.removeFile(filePath)

          // After the listing and the first removal, "inner" is moved away
          // and a link to the outside folder takes its name.
          if (!isSwapped) {
            isSwapped = true
            fs.renameSync(
              path.join(folderPath, "inner"),
              path.join(workPath, "Moved"),
            )
            fs.symlinkSync(
              path.join(outsidePath, "inner"),
              path.join(folderPath, "inner"),
              "dir",
            )
          }
        },
      },
      removalConcurrency: 1,
      signal: new AbortController().signal,
      targets: [
        { filePath: folderPath, isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(
      fs.readdirSync(path.join(outsidePath, "inner")),
    ).toHaveLength(3)
    expect(result.items[0]?.outcome).toBe("failed")
  })
})

describe("toSafeDeleteTargets", () => {
  test("passes absolute paths through unchanged", () => {
    const filePath = path.join(workPath, "Album")

    expect(
      toSafeDeleteTargets([
        { filePath, isDirectory: true },
      ]),
    ).toEqual([{ filePath, isDirectory: true }])
  })

  test.each([
    ["a filesystem root", path.parse(process.cwd()).root],
    ["a relative path", "Album"],
    ["an empty path", ""],
  ])("refuses %s", (_label, filePath) => {
    expect(() =>
      toSafeDeleteTargets([
        { filePath, isDirectory: true },
      ]),
    ).toThrow()
  })

  test("refuses anything that is not a list of targets", () => {
    expect(() => toSafeDeleteTargets("C:\\")).toThrow()
    expect(() => toSafeDeleteTargets([null])).toThrow()
  })
})
