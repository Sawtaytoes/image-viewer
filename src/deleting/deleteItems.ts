// The delete job: what the confirmation shows before a delete, and the
// per-item, stoppable run that reports progress while it works.
//
// This module is pure. It touches the disk only through the `DeleteFileSystem`
// it is handed, so the same code runs in three places: the main process over
// the real disk (`nodeDeleteFileSystem.ts`), the preload's fake filesystem,
// and the browser build's fake filesystem. The renderer imports its types only.
//
// The rules it carries (docs/decisions/2026-11-13-delete-shows-what-it-removes-
// with-progress-and-a-stop-button.md):
//
// - Each item goes to the trash first. When the trash is unavailable (a
//   network share, a full Recycle Bin), the item is deleted permanently. That
//   fallback is intentional and asks no second question.
// - The permanent delete removes one file at a time, so it can report "N of M"
//   and stop between files. The old `fs.rm({ recursive })` was one opaque call
//   with no progress and no way to stop, which is why a large folder on a
//   network share looked like a frozen app.
// - Stop halts the remaining work. It cannot undo what is already removed, and
//   it cannot interrupt a trash call that is in progress: the OS offers no way.

export interface DeleteTarget {
  filePath: string
  isDirectory: boolean
}

// What one entry on disk is. A symbolic link or a junction is never a
// directory here, so a delete never follows a link into another tree.
export interface DeleteEntryInfo {
  isDirectory: boolean
  size: number
}

export interface DeleteDirectoryEntry {
  isDirectory: boolean
  path: string
}

export interface DeleteFileSystem {
  basename: (filePath: string) => string
  getEntryInfo: (
    filePath: string,
  ) => Promise<DeleteEntryInfo>
  listDirectory: (
    directoryPath: string,
  ) => Promise<DeleteDirectoryEntry[]>
  removeDirectory: (directoryPath: string) => Promise<void>
  removeFile: (filePath: string) => Promise<void>
}

// Null means "this platform or mode has no trash"; every item then goes
// straight to the permanent delete.
export type TrashItem =
  | ((filePath: string) => Promise<void>)
  | null

export interface DeleteSummaryItem {
  errorMessage: string | null
  filePath: string
  // Files inside a folder, or 1 for a file target.
  fileCount: number
  // Folders inside a folder, not counting the folder itself.
  folderCount: number
  isDirectory: boolean
  // False when counting stopped at the budget, so every count is a minimum.
  isComplete: boolean
  name: string
  totalBytes: number
}

export interface DeleteSummary {
  fileCount: number
  folderCount: number
  isComplete: boolean
  items: DeleteSummaryItem[]
  totalBytes: number
}

export type DeletePhase =
  | "listing"
  | "removing"
  | "trashing"

export interface DeleteProgress {
  // The entry being removed right now, during the "removing" phase.
  currentPath: string | null
  // Files and folders removed so far inside the current item.
  entriesDone: number
  // Files and folders the current item holds; null until they are listed.
  entriesTotal: number | null
  isStopRequested: boolean
  itemCount: number
  // 0-based.
  itemIndex: number
  itemName: string
  itemPath: string
  phase: DeletePhase
}

export type DeleteOutcome =
  // The trash took it whole.
  | "movedToTrash"
  // The trash was unavailable, so it was deleted permanently.
  | "deletedPermanently"
  // Stop was pressed partway through a permanent delete.
  | "partlyDeleted"
  // Stop was pressed before this item lost anything.
  | "notDeleted"
  // An error ended the delete. Some entries may already be gone.
  | "failed"

export interface DeleteItemResult {
  entriesRemoved: number
  entriesTotal: number | null
  errorMessage: string | null
  filePath: string
  isDirectory: boolean
  name: string
  outcome: DeleteOutcome
  // Why the trash refused the item, when it did.
  trashErrorMessage: string | null
}

export interface DeleteJobResult {
  isStopped: boolean
  items: DeleteItemResult[]
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

// The confirmation counts what a delete would remove, but only while that is
// cheap. A huge folder on a network share could take minutes to walk, and the
// question cannot wait that long, so the walk stops at whichever budget runs
// out first and the counts become "at least".
export const defaultSummaryEntryLimit = 10_000
export const defaultSummaryTimeLimitMs = 1_500

export const summarizeDeleteTargets = async ({
  entryLimit = defaultSummaryEntryLimit,
  fileSystem,
  now = Date.now,
  targets,
  timeLimitMs = defaultSummaryTimeLimitMs,
}: {
  entryLimit?: number
  fileSystem: DeleteFileSystem
  now?: () => number
  targets: readonly DeleteTarget[]
  timeLimitMs?: number
}): Promise<DeleteSummary> => {
  const startedAt = now()

  let entriesVisited = 0

  const isOverBudget = () =>
    entriesVisited >= entryLimit ||
    now() - startedAt >= timeLimitMs

  const items: DeleteSummaryItem[] = []

  for (const target of targets) {
    const item: DeleteSummaryItem = {
      errorMessage: null,
      fileCount: 0,
      filePath: target.filePath,
      folderCount: 0,
      isComplete: true,
      isDirectory: target.isDirectory,
      name: fileSystem.basename(target.filePath),
      totalBytes: 0,
    }

    items.push(item)

    try {
      const info = await fileSystem.getEntryInfo(
        target.filePath,
      )

      item.isDirectory = info.isDirectory

      if (!info.isDirectory) {
        item.fileCount = 1
        item.totalBytes = info.size

        continue
      }

      const pendingDirectories = [target.filePath]

      while (pendingDirectories.length > 0) {
        if (isOverBudget()) {
          item.isComplete = false

          break
        }

        const directoryPath = pendingDirectories.shift()

        if (directoryPath === undefined) {
          break
        }

        const entries =
          await fileSystem.listDirectory(directoryPath)

        for (const entry of entries) {
          if (isOverBudget()) {
            item.isComplete = false

            break
          }

          entriesVisited += 1

          if (entry.isDirectory) {
            item.folderCount += 1
            pendingDirectories.push(entry.path)
          } else {
            item.fileCount += 1

            const entryInfo = await fileSystem
              .getEntryInfo(entry.path)
              .catch(() => null)

            item.totalBytes += entryInfo?.size ?? 0
          }
        }

        if (!item.isComplete) {
          break
        }
      }
    } catch (error) {
      item.errorMessage = toErrorMessage(error)
      item.isComplete = false
    }
  }

  return {
    fileCount: items.reduce(
      (total, item) => total + item.fileCount,
      0,
    ),
    folderCount: items.reduce(
      (total, item) => total + item.folderCount,
      0,
    ),
    isComplete: items.every((item) => item.isComplete),
    items,
    totalBytes: items.reduce(
      (total, item) => total + item.totalBytes,
      0,
    ),
  }
}

// Every entry under a folder, files first in walk order and folders deepest
// first, so removing them in this order only ever removes an empty folder.
const listFolderContents = async ({
  directoryPath,
  fileSystem,
  onEntryFound,
  signal,
}: {
  directoryPath: string
  fileSystem: DeleteFileSystem
  onEntryFound: (entryCount: number) => void
  signal: AbortSignal
}): Promise<{
  directoryPaths: string[]
  filePaths: string[]
} | null> => {
  const filePaths: string[] = []
  const directoryPaths: string[] = []
  const pendingDirectories = [directoryPath]

  while (pendingDirectories.length > 0) {
    if (signal.aborted) {
      return null
    }

    const nextDirectory = pendingDirectories.shift()

    if (nextDirectory === undefined) {
      break
    }

    const entries =
      await fileSystem.listDirectory(nextDirectory)

    for (const entry of entries) {
      if (entry.isDirectory) {
        directoryPaths.push(entry.path)
        pendingDirectories.push(entry.path)
      } else {
        filePaths.push(entry.path)
      }
    }

    onEntryFound(filePaths.length + directoryPaths.length)
  }

  // A breadth-first walk lists parents before children, so reversing it puts
  // every folder after all of its subfolders.
  return {
    directoryPaths: directoryPaths.reverse(),
    filePaths,
  }
}

// How many files the permanent delete removes at once. One at a time is slow
// on a network share, where each removal waits on a round trip; a small pool
// keeps it moving while Stop still lands within a few files.
export const defaultRemovalConcurrency = 4

// Progress goes over IPC, so it is sent at most this often. Phase changes and
// the first update of each item always go out at once.
export const defaultProgressIntervalMs = 100

export const runDeleteJob = async ({
  fileSystem,
  now = Date.now,
  onProgress,
  progressIntervalMs = defaultProgressIntervalMs,
  removalConcurrency = defaultRemovalConcurrency,
  signal,
  targets,
  trashItem,
}: {
  fileSystem: DeleteFileSystem
  now?: () => number
  onProgress?: (progress: DeleteProgress) => void
  progressIntervalMs?: number
  removalConcurrency?: number
  signal: AbortSignal
  targets: readonly DeleteTarget[]
  trashItem: TrashItem
}): Promise<DeleteJobResult> => {
  const items: DeleteItemResult[] = []

  let lastProgressAt = Number.NEGATIVE_INFINITY
  let lastPhaseKey = ""

  // An update held back by the interval is sent when the interval ends, so
  // the dialog never sits on a stale count while removals finish in a burst.
  let heldProgress: Omit<
    DeleteProgress,
    "isStopRequested"
  > | null = null
  let heldProgressTimer: ReturnType<
    typeof setTimeout
  > | null = null

  const sendProgress = (
    progress: Omit<DeleteProgress, "isStopRequested">,
  ) => {
    lastPhaseKey = `${progress.itemIndex}:${progress.phase}`
    lastProgressAt = now()
    heldProgress = null

    onProgress?.({
      ...progress,
      isStopRequested: signal.aborted,
    })
  }

  const reportProgress = (
    progress: Omit<DeleteProgress, "isStopRequested">,
    { isForced = false }: { isForced?: boolean } = {},
  ) => {
    if (!onProgress) {
      return
    }

    const phaseKey = `${progress.itemIndex}:${progress.phase}`
    const waitMs =
      progressIntervalMs - (now() - lastProgressAt)

    if (
      isForced ||
      phaseKey !== lastPhaseKey ||
      waitMs <= 0
    ) {
      sendProgress(progress)

      return
    }

    heldProgress = progress

    heldProgressTimer ??= setTimeout(() => {
      heldProgressTimer = null

      if (heldProgress) {
        sendProgress(heldProgress)
      }
    }, waitMs)
  }

  for (const [itemIndex, target] of targets.entries()) {
    const name = fileSystem.basename(target.filePath)

    const baseResult = {
      entriesRemoved: 0,
      entriesTotal: null,
      errorMessage: null,
      filePath: target.filePath,
      isDirectory: target.isDirectory,
      name,
      trashErrorMessage: null,
    }

    if (signal.aborted) {
      items.push({ ...baseResult, outcome: "notDeleted" })

      continue
    }

    const baseProgress = {
      currentPath: null,
      entriesDone: 0,
      entriesTotal: null,
      itemCount: targets.length,
      itemIndex,
      itemName: name,
      itemPath: target.filePath,
    }

    let trashErrorMessage: string | null = null

    if (trashItem) {
      reportProgress({ ...baseProgress, phase: "trashing" })

      try {
        await trashItem(target.filePath)

        items.push({
          ...baseResult,
          outcome: "movedToTrash",
        })

        continue
      } catch (error) {
        trashErrorMessage = toErrorMessage(error)
      }

      // Stop arrived while the trash was trying. The trash refused the item,
      // so nothing is gone yet; do not start the permanent delete.
      if (signal.aborted) {
        items.push({
          ...baseResult,
          outcome: "notDeleted",
          trashErrorMessage,
        })

        continue
      }
    }

    const result = await deletePermanently({
      baseProgress,
      fileSystem,
      removalConcurrency,
      reportProgress,
      signal,
      target,
    })

    items.push({
      ...baseResult,
      ...result,
      trashErrorMessage,
    })
  }

  // The result says everything the held update would have.
  if (heldProgressTimer !== null) {
    clearTimeout(heldProgressTimer)
  }

  return {
    isStopped:
      signal.aborted &&
      items.some(
        (item) =>
          item.outcome === "notDeleted" ||
          item.outcome === "partlyDeleted",
      ),
    items,
  }
}

const deletePermanently = async ({
  baseProgress,
  fileSystem,
  removalConcurrency,
  reportProgress,
  signal,
  target,
}: {
  baseProgress: Omit<
    DeleteProgress,
    "isStopRequested" | "phase"
  >
  fileSystem: DeleteFileSystem
  removalConcurrency: number
  reportProgress: (
    progress: Omit<DeleteProgress, "isStopRequested">,
    options?: { isForced?: boolean },
  ) => void
  signal: AbortSignal
  target: DeleteTarget
}): Promise<
  Pick<
    DeleteItemResult,
    | "entriesRemoved"
    | "entriesTotal"
    | "errorMessage"
    | "outcome"
  >
> => {
  let entriesRemoved = 0
  let entriesTotal: number | null = null

  try {
    const info = await fileSystem.getEntryInfo(
      target.filePath,
    )

    if (!info.isDirectory) {
      entriesTotal = 1

      reportProgress({
        ...baseProgress,
        currentPath: target.filePath,
        entriesTotal,
        phase: "removing",
      })

      await fileSystem.removeFile(target.filePath)

      entriesRemoved = 1

      return {
        entriesRemoved,
        entriesTotal,
        errorMessage: null,
        outcome: "deletedPermanently",
      }
    }

    reportProgress({ ...baseProgress, phase: "listing" })

    const contents = await listFolderContents({
      directoryPath: target.filePath,
      fileSystem,
      onEntryFound: (entryCount) => {
        reportProgress({
          ...baseProgress,
          entriesTotal: null,
          phase: "listing",
          // The count found so far rides in `entriesDone` while listing.
          entriesDone: entryCount,
        })
      },
      signal,
    })

    if (!contents) {
      return {
        entriesRemoved,
        entriesTotal,
        errorMessage: null,
        outcome: "notDeleted",
      }
    }

    // The folder itself is the last entry.
    entriesTotal =
      contents.filePaths.length +
      contents.directoryPaths.length +
      1

    const totalForProgress = entriesTotal

    const reportRemoval = (
      currentPath: string,
      isForced = false,
    ) => {
      reportProgress(
        {
          ...baseProgress,
          currentPath,
          entriesDone: entriesRemoved,
          entriesTotal: totalForProgress,
          phase: "removing",
        },
        { isForced },
      )
    }

    reportRemoval(target.filePath, true)

    // A small pool of workers pulls from one shared index. Each checks Stop
    // before it takes the next file, so Stop halts the run after at most
    // `removalConcurrency` files that were already under way.
    let nextFileIndex = 0
    let firstError: unknown = null

    const removeNextFiles = async () => {
      while (
        !signal.aborted &&
        firstError === null &&
        nextFileIndex < contents.filePaths.length
      ) {
        const filePath = contents.filePaths[nextFileIndex]

        nextFileIndex += 1

        try {
          await fileSystem.removeFile(filePath)

          entriesRemoved += 1

          reportRemoval(filePath)
        } catch (error) {
          firstError ??= error
        }
      }
    }

    await Promise.all(
      Array.from(
        {
          length: Math.max(
            1,
            Math.min(
              removalConcurrency,
              contents.filePaths.length,
            ),
          ),
        },
        removeNextFiles,
      ),
    )

    if (firstError !== null) {
      throw firstError
    }

    for (const directoryPath of [
      ...contents.directoryPaths,
      target.filePath,
    ]) {
      if (signal.aborted) {
        break
      }

      await fileSystem.removeDirectory(directoryPath)

      entriesRemoved += 1

      reportRemoval(directoryPath)
    }

    if (entriesRemoved < entriesTotal) {
      return {
        entriesRemoved,
        entriesTotal,
        errorMessage: null,
        outcome:
          entriesRemoved === 0
            ? "notDeleted"
            : "partlyDeleted",
      }
    }

    return {
      entriesRemoved,
      entriesTotal,
      errorMessage: null,
      outcome: "deletedPermanently",
    }
  } catch (error) {
    return {
      entriesRemoved,
      entriesTotal,
      errorMessage: toErrorMessage(error),
      outcome: "failed",
    }
  }
}

// Whether a delete took the whole item away, so a caller can drop it from its
// listing or queue. A partial delete leaves the folder on disk.
export const isTargetRemoved = (
  result: DeleteJobResult,
  filePath: string,
): boolean =>
  result.items.some(
    (item) =>
      item.filePath === filePath &&
      (item.outcome === "movedToTrash" ||
        item.outcome === "deletedPermanently"),
  )

// The `window.api.deleteItems` surface. The renderer picks the job id, so it
// can stop a job before the job's first progress arrives.
export interface DeleteItemsApi {
  start: (
    request: {
      jobId: string
      targets: readonly DeleteTarget[]
    },
    onProgress: (progress: DeleteProgress) => void,
  ) => Promise<DeleteJobResult>
  stop: (jobId: string) => void
  summarize: (
    targets: readonly DeleteTarget[],
  ) => Promise<DeleteSummary>
}

// The same surface without IPC, for a filesystem that lives in this process:
// the fake filesystem in the preload and in the browser build. The real disk
// goes through main's `delete:*` channels instead.
export const createInProcessDeleteItemsApi = ({
  fileSystem,
  trashItem,
}: {
  fileSystem: DeleteFileSystem
  trashItem: TrashItem
}): DeleteItemsApi => {
  const abortControllersByJobId = new Map<
    string,
    AbortController
  >()

  return {
    start: ({ jobId, targets }, onProgress) => {
      const abortController = new AbortController()

      abortControllersByJobId.set(jobId, abortController)

      return runDeleteJob({
        fileSystem,
        onProgress,
        signal: abortController.signal,
        targets,
        trashItem,
      }).finally(() => {
        abortControllersByJobId.delete(jobId)
      })
    },
    stop: (jobId) => {
      abortControllersByJobId.get(jobId)?.abort()
    },
    summarize: (targets) =>
      summarizeDeleteTargets({ fileSystem, targets }),
  }
}
