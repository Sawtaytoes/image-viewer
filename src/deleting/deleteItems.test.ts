import { describe, expect, test, vi } from "vitest"

import {
  type DeleteFileSystem,
  type DeleteProgress,
  isTargetRemoved,
  runDeleteJob,
  summarizeDeleteTargets,
} from "./deleteItems"

// A small in-memory tree behind the `DeleteFileSystem` seam. Paths are
// "/"-joined; a key ending in "/" is a folder. `onRemove` runs after each
// removal, so a test can press Stop at an exact point.
const createMemoryFileSystem = (
  paths: Record<string, number>,
  {
    onRemove,
    failingPath,
  }: {
    failingPath?: string
    onRemove?: (removedPath: string) => void
  } = {},
) => {
  const sizesByPath = new Map<string, number>()
  const directories = new Set<string>()

  for (const [entryPath, size] of Object.entries(paths)) {
    if (entryPath.endsWith("/")) {
      directories.add(entryPath.slice(0, -1))
    } else {
      sizesByPath.set(entryPath, size)
    }
  }

  const parentOf = (entryPath: string) =>
    entryPath.slice(0, entryPath.lastIndexOf("/"))

  const exists = (entryPath: string) =>
    directories.has(entryPath) || sizesByPath.has(entryPath)

  const removed: string[] = []

  const fileSystem: DeleteFileSystem = {
    basename: (entryPath) =>
      entryPath.slice(entryPath.lastIndexOf("/") + 1),
    getEntryInfo: async (entryPath) => {
      if (!exists(entryPath)) {
        throw new Error(`missing: ${entryPath}`)
      }

      return {
        isDirectory: directories.has(entryPath),
        size: sizesByPath.get(entryPath) ?? 0,
      }
    },
    listDirectory: async (directoryPath) =>
      [...directories, ...sizesByPath.keys()]
        .filter(
          (entryPath) =>
            parentOf(entryPath) === directoryPath,
        )
        .sort()
        .map((entryPath) => ({
          isDirectory: directories.has(entryPath),
          path: entryPath,
        })),
    removeDirectory: async (directoryPath) => {
      const hasChildren = [
        ...directories,
        ...sizesByPath.keys(),
      ].some(
        (entryPath) =>
          parentOf(entryPath) === directoryPath,
      )

      if (hasChildren) {
        throw Object.assign(
          new Error(`not empty: ${directoryPath}`),
          { code: "ENOTEMPTY" },
        )
      }

      directories.delete(directoryPath)
      removed.push(directoryPath)
      onRemove?.(directoryPath)
    },
    removeFile: async (filePath) => {
      if (filePath === failingPath) {
        throw new Error(`locked: ${filePath}`)
      }

      sizesByPath.delete(filePath)
      removed.push(filePath)
      onRemove?.(filePath)
    },
  }

  // Another program writing into the tree mid-delete.
  const addFile = (filePath: string, size = 1) => {
    sizesByPath.set(filePath, size)
  }

  // A folder swapped for a link (a file-like entry) mid-delete.
  const replaceFolderWithLink = (folderPath: string) => {
    for (const entryPath of [
      ...directories,
      ...sizesByPath.keys(),
    ]) {
      if (entryPath.startsWith(`${folderPath}/`)) {
        directories.delete(entryPath)
        sizesByPath.delete(entryPath)
      }
    }

    directories.delete(folderPath)
    sizesByPath.set(folderPath, 0)
  }

  return {
    addFile,
    exists,
    fileSystem,
    removed,
    replaceFolderWithLink,
  }
}

// "/share/Cats" with 3 photos and a subfolder of 2, plus a loose file.
const shareTree = {
  "/share/": 0,
  "/share/Cats/": 0,
  "/share/Cats/a.jpg": 100,
  "/share/Cats/b.jpg": 200,
  "/share/Cats/c.jpg": 300,
  "/share/Cats/Kittens/": 0,
  "/share/Cats/Kittens/d.jpg": 400,
  "/share/Cats/Kittens/e.jpg": 500,
  "/share/notes.txt": 50,
}

const refuseTrash = () =>
  Promise.reject(
    new Error("The Recycle Bin is not available"),
  )

describe("summarizeDeleteTargets", () => {
  test("counts files, folders, and bytes under each target", async () => {
    const { fileSystem } = createMemoryFileSystem(shareTree)

    const summary = await summarizeDeleteTargets({
      fileSystem,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
    })

    expect(summary.items).toEqual([
      expect.objectContaining({
        fileCount: 5,
        folderCount: 1,
        isComplete: true,
        name: "Cats",
        totalBytes: 1500,
      }),
      expect.objectContaining({
        fileCount: 1,
        folderCount: 0,
        isDirectory: false,
        name: "notes.txt",
        totalBytes: 50,
      }),
    ])

    expect(summary).toMatchObject({
      fileCount: 6,
      folderCount: 1,
      isComplete: true,
      totalBytes: 1550,
    })
  })

  test("stops counting at the entry budget and marks the counts as a minimum", async () => {
    const { fileSystem } = createMemoryFileSystem(shareTree)

    const summary = await summarizeDeleteTargets({
      entryLimit: 2,
      fileSystem,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
    })

    expect(summary.isComplete).toBe(false)
    expect(summary.items[0]?.isComplete).toBe(false)
    expect(
      summary.items[0]?.fileCount ?? 0,
    ).toBeLessThanOrEqual(2)
  })

  test("stops counting when the time budget runs out", async () => {
    const { fileSystem } = createMemoryFileSystem(shareTree)

    let currentTime = 0

    const summary = await summarizeDeleteTargets({
      fileSystem,
      // Every clock read moves time on by a second.
      now: () => {
        currentTime += 1_000

        return currentTime
      },
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      timeLimitMs: 1_500,
    })

    expect(summary.isComplete).toBe(false)
  })

  test("reports a target it cannot read without failing the others", async () => {
    const { fileSystem } = createMemoryFileSystem(shareTree)

    const summary = await summarizeDeleteTargets({
      fileSystem,
      targets: [
        { filePath: "/share/Gone", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
    })

    expect(summary.items[0]?.errorMessage).toContain(
      "missing",
    )
    expect(summary.items[1]?.totalBytes).toBe(50)
  })
})

describe("runDeleteJob", () => {
  test("moves each item to the trash whole when the trash takes it", async () => {
    const { fileSystem, removed } =
      createMemoryFileSystem(shareTree)

    const trashItem = vi.fn(() => Promise.resolve())
    const progress: DeleteProgress[] = []

    const result = await runDeleteJob({
      fileSystem,
      onProgress: (update) => {
        progress.push(update)
      },
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem,
    })

    expect(trashItem).toHaveBeenCalledTimes(2)
    expect(removed).toEqual([])
    expect(result.isStopped).toBe(false)
    expect(
      result.items.map(({ outcome }) => outcome),
    ).toEqual(["movedToTrash", "movedToTrash"])
    expect(
      progress.map(({ itemIndex, phase }) => [
        itemIndex,
        phase,
      ]),
    ).toEqual([
      [0, "trashing"],
      [1, "trashing"],
    ])
  })

  test("deletes permanently, file by file, when the trash refuses an item", async () => {
    const { exists, fileSystem, removed } =
      createMemoryFileSystem(shareTree)

    const progress: DeleteProgress[] = []

    const result = await runDeleteJob({
      fileSystem,
      onProgress: (update) => {
        progress.push(update)
      },
      progressIntervalMs: 0,
      removalConcurrency: 1,
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(exists("/share/Cats")).toBe(false)
    expect(exists("/share/notes.txt")).toBe(true)

    // Files first, then the subfolder, then the folder itself.
    expect(removed.slice(-2)).toEqual([
      "/share/Cats/Kittens",
      "/share/Cats",
    ])

    expect(result.items[0]).toMatchObject({
      entriesRemoved: 7,
      entriesTotal: 7,
      outcome: "deletedPermanently",
      trashErrorMessage: "The Recycle Bin is not available",
    })

    const phases = [
      ...new Set(progress.map(({ phase }) => phase)),
    ]

    expect(phases).toEqual([
      "trashing",
      "listing",
      "removing",
    ])

    const removing = progress.filter(
      ({ phase }) => phase === "removing",
    )

    // Counts climb one entry at a time to the total, naming each entry.
    expect(
      removing.map(({ entriesDone }) => entriesDone),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(
      removing.every(
        ({ entriesTotal }) => entriesTotal === 7,
      ),
    ).toBe(true)
    expect(removing.at(-1)?.currentPath).toBe("/share/Cats")
  })

  test("goes straight to the permanent delete when there is no trash", async () => {
    const { fileSystem } = createMemoryFileSystem(shareTree)

    const result = await runDeleteJob({
      fileSystem,
      signal: new AbortController().signal,
      targets: [
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem: null,
    })

    expect(result.items[0]).toMatchObject({
      outcome: "deletedPermanently",
      trashErrorMessage: null,
    })
  })

  test("Stop halts a permanent delete between files and leaves the rest", async () => {
    const abortController = new AbortController()

    const { exists, fileSystem, removed } =
      createMemoryFileSystem(shareTree, {
        onRemove: () => {
          // Press Stop once two files are gone.
          if (removed.length === 2) {
            abortController.abort()
          }
        },
      })

    const progress: DeleteProgress[] = []

    const result = await runDeleteJob({
      fileSystem,
      onProgress: (update) => {
        progress.push(update)
      },
      progressIntervalMs: 0,
      removalConcurrency: 1,
      signal: abortController.signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem: refuseTrash,
    })

    expect(removed).toHaveLength(2)
    expect(exists("/share/Cats")).toBe(true)
    expect(exists("/share/notes.txt")).toBe(true)

    expect(result.isStopped).toBe(true)
    expect(result.items).toEqual([
      expect.objectContaining({
        entriesRemoved: 2,
        entriesTotal: 7,
        outcome: "partlyDeleted",
      }),
      expect.objectContaining({
        filePath: "/share/notes.txt",
        outcome: "notDeleted",
      }),
    ])

    // Progress after Stop says so, so the dialog can show "Stopping".
    expect(progress.at(-1)?.isStopRequested).toBe(true)
  })

  test("Stop with several removals under way lets only those finish", async () => {
    const abortController = new AbortController()

    const { fileSystem, removed } = createMemoryFileSystem(
      shareTree,
      {
        onRemove: () => {
          abortController.abort()
        },
      },
    )

    const result = await runDeleteJob({
      fileSystem,
      removalConcurrency: 3,
      signal: abortController.signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    // Three workers each had one file in hand when Stop landed.
    expect(removed.length).toBeLessThanOrEqual(3)
    expect(result.items[0]?.outcome).toBe("partlyDeleted")
  })

  test("Stop while the trash works lets it finish, but never starts a permanent delete", async () => {
    const abortController = new AbortController()

    const { exists, fileSystem, removed } =
      createMemoryFileSystem(shareTree)

    const result = await runDeleteJob({
      fileSystem,
      signal: abortController.signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem: () => {
        abortController.abort()

        return refuseTrash()
      },
    })

    expect(removed).toEqual([])
    expect(exists("/share/Cats")).toBe(true)
    expect(result.items).toEqual([
      expect.objectContaining({
        outcome: "notDeleted",
        trashErrorMessage:
          "The Recycle Bin is not available",
      }),
      expect.objectContaining({ outcome: "notDeleted" }),
    ])
  })

  test("Stop after the trash took an item keeps that item's result", async () => {
    const abortController = new AbortController()

    const { fileSystem } = createMemoryFileSystem(shareTree)

    const result = await runDeleteJob({
      fileSystem,
      signal: abortController.signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem: () => {
        abortController.abort()

        return Promise.resolve()
      },
    })

    expect(
      result.items.map(({ outcome }) => outcome),
    ).toEqual(["movedToTrash", "notDeleted"])
    expect(result.isStopped).toBe(true)
  })

  test("an error ends that item as failed, says how much went, and moves on", async () => {
    const { exists, fileSystem } = createMemoryFileSystem(
      shareTree,
      { failingPath: "/share/Cats/c.jpg" },
    )

    const result = await runDeleteJob({
      fileSystem,
      removalConcurrency: 1,
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem: refuseTrash,
    })

    expect(result.items[0]).toMatchObject({
      entriesRemoved: 2,
      errorMessage: "locked: /share/Cats/c.jpg",
      outcome: "failed",
    })
    expect(result.items[1]?.outcome).toBe(
      "deletedPermanently",
    )
    expect(exists("/share/Cats/c.jpg")).toBe(true)
    expect(result.isStopped).toBe(false)
  })

  test("sends progress no more often than the interval within one phase", async () => {
    const { fileSystem } = createMemoryFileSystem(shareTree)

    const progress: DeleteProgress[] = []

    // The clock never moves, so only the forced and phase-change updates go.
    await runDeleteJob({
      fileSystem,
      now: () => 0,
      onProgress: (update) => {
        progress.push(update)
      },
      progressIntervalMs: 100,
      removalConcurrency: 1,
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(
      progress.map(({ entriesDone, phase }) => [
        phase,
        entriesDone,
      ]),
    ).toEqual([
      ["trashing", 0],
      ["listing", 0],
      ["removing", 0],
    ])
  })
})

describe("runDeleteJob when the tree changes underneath it", () => {
  test("Stop while a file target is looked up never removes it", async () => {
    const abortController = new AbortController()

    const { exists, fileSystem, removed } =
      createMemoryFileSystem(shareTree)

    const getEntryInfo = fileSystem.getEntryInfo

    fileSystem.getEntryInfo = async (entryPath) => {
      const info = await getEntryInfo(entryPath)

      abortController.abort()

      return info
    }

    const result = await runDeleteJob({
      fileSystem,
      signal: abortController.signal,
      targets: [
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
      ],
      trashItem: refuseTrash,
    })

    expect(removed).toEqual([])
    expect(exists("/share/notes.txt")).toBe(true)
    expect(result).toMatchObject({
      isStopped: true,
      items: [
        expect.objectContaining({ outcome: "notDeleted" }),
      ],
    })
  })

  test("a file that appears after the listing is found, counted, and removed one by one", async () => {
    let hasAdded = false

    const memory = createMemoryFileSystem(shareTree, {
      onRemove: (removedPath) => {
        // Explorer drops a thumbnail cache into a folder mid-delete.
        if (
          !hasAdded &&
          removedPath === "/share/Cats/a.jpg"
        ) {
          hasAdded = true
          memory.addFile("/share/Cats/Kittens/Thumbs.db")
        }
      },
    })

    const result = await runDeleteJob({
      fileSystem: memory.fileSystem,
      removalConcurrency: 1,
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(memory.exists("/share/Cats")).toBe(false)
    expect(memory.removed).toContain(
      "/share/Cats/Kittens/Thumbs.db",
    )
    expect(result.items[0]).toMatchObject({
      entriesRemoved: 8,
      entriesTotal: 8,
      outcome: "deletedPermanently",
    })
  })

  test("Stop still works while a re-listed folder's new entries are removed", async () => {
    const abortController = new AbortController()

    let hasAdded = false

    const memory = createMemoryFileSystem(shareTree, {
      onRemove: (removedPath) => {
        if (
          !hasAdded &&
          removedPath === "/share/Cats/a.jpg"
        ) {
          hasAdded = true

          for (let index = 0; index < 5; index += 1) {
            memory.addFile(
              `/share/Cats/Kittens/new-${index}.jpg`,
            )
          }
        }

        if (
          removedPath === "/share/Cats/Kittens/new-1.jpg"
        ) {
          abortController.abort()
        }
      },
    })

    const result = await runDeleteJob({
      fileSystem: memory.fileSystem,
      removalConcurrency: 1,
      signal: abortController.signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(result.items[0]).toMatchObject({
      outcome: "partlyDeleted",
    })
    expect(
      memory.exists("/share/Cats/Kittens/new-2.jpg"),
    ).toBe(true)
    expect(memory.exists("/share/Cats/Kittens")).toBe(true)
  })

  test("a folder that keeps refilling fails after a few listings instead of looping", async () => {
    let addCount = 0

    const memory = createMemoryFileSystem(
      { "/share/": 0, "/share/Busy/": 0 },
      {
        onRemove: () => {
          addCount += 1
          memory.addFile(
            `/share/Busy/again-${addCount}.jpg`,
          )
        },
      },
    )

    memory.addFile("/share/Busy/first.jpg")

    const result = await runDeleteJob({
      fileSystem: memory.fileSystem,
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Busy", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(result.items[0]).toMatchObject({
      errorMessage: "not empty: /share/Busy",
      outcome: "failed",
    })
  })

  test("a folder swapped for a link after the listing is removed as a link, never read", async () => {
    const memory = createMemoryFileSystem(shareTree)

    const listDirectory = memory.fileSystem.listDirectory
    const listedPaths: string[] = []

    memory.fileSystem.listDirectory = async (
      directoryPath,
    ) => {
      listedPaths.push(directoryPath)

      const entries = await listDirectory(directoryPath)

      // Right after the top folder is read, its subfolder becomes a link.
      if (directoryPath === "/share/Cats") {
        memory.replaceFolderWithLink("/share/Cats/Kittens")
      }

      return entries
    }

    const result = await runDeleteJob({
      fileSystem: memory.fileSystem,
      signal: new AbortController().signal,
      targets: [
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: refuseTrash,
    })

    expect(listedPaths).toEqual(["/share/Cats"])
    expect(memory.removed).toContain("/share/Cats/Kittens")
    expect(result.items[0]?.outcome).toBe(
      "deletedPermanently",
    )
  })
})

describe("runDeleteJob progress timing", () => {
  test("sends a held-back count once the interval passes, so the dialog never shows a stale one", async () => {
    vi.useFakeTimers()

    try {
      let releaseLastFile: () => void = () => {}

      const lastFileGate = new Promise<void>((resolve) => {
        releaseLastFile = resolve
      })

      const { fileSystem } = createMemoryFileSystem({
        "/a/": 0,
        "/a/1.jpg": 1,
        "/a/2.jpg": 1,
        "/a/3.jpg": 1,
      })

      const removeFile = fileSystem.removeFile

      fileSystem.removeFile = async (filePath) => {
        if (filePath === "/a/3.jpg") {
          await lastFileGate
        }

        await removeFile(filePath)
      }

      const progress: DeleteProgress[] = []

      const job = runDeleteJob({
        fileSystem,
        now: Date.now,
        onProgress: (update) => {
          progress.push(update)
        },
        progressIntervalMs: 100,
        removalConcurrency: 1,
        signal: new AbortController().signal,
        targets: [{ filePath: "/a", isDirectory: true }],
        trashItem: null,
      })

      // Two files go at once; only the forced 0 is sent inside the interval.
      await vi.advanceTimersByTimeAsync(0)

      expect(progress.at(-1)).toMatchObject({
        entriesDone: 0,
        phase: "removing",
      })

      // The interval ends while the third file is still going.
      await vi.advanceTimersByTimeAsync(100)

      expect(progress.at(-1)).toMatchObject({
        entriesDone: 2,
        phase: "removing",
      })

      releaseLastFile()

      await vi.runAllTimersAsync()
      await job
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("isTargetRemoved", () => {
  test("is true only for an item the trash or the permanent delete took whole", async () => {
    const abortController = new AbortController()

    const { fileSystem } = createMemoryFileSystem(shareTree)

    const result = await runDeleteJob({
      fileSystem,
      signal: abortController.signal,
      targets: [
        {
          filePath: "/share/notes.txt",
          isDirectory: false,
        },
        { filePath: "/share/Cats", isDirectory: true },
      ],
      trashItem: () => {
        abortController.abort()

        return Promise.resolve()
      },
    })

    expect(
      isTargetRemoved(result, "/share/notes.txt"),
    ).toBe(true)
    expect(isTargetRemoved(result, "/share/Cats")).toBe(
      false,
    )
  })
})
