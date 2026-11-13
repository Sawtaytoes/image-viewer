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
  // Which folder or file this is on its disk (device and inode on a real
  // disk), or null when the platform cannot say. The delete compares it to
  // catch a folder that was moved or replaced after it was listed.
  identity: string | null
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

// One entry found under a folder, with the folder it was found in. Before the
// entry is removed, that folder is checked to still be the one listed.
interface ListedEntry {
  parentPath: string
  path: string
}

// A folder as it was when listed: its identity (null when the disk cannot
// say) and the folder it is in (null for the item being deleted).
interface ListedFolder {
  identity: string | null
  parentPath: string | null
}

// Thrown when a folder is no longer the one that was listed: it was moved, or
// it (or a folder above it) was replaced with a link. Removing by the old path
// then could reach a tree outside the delete, so the item stops there.
const createFolderChangedError = (name: string) =>
  new Error(
    `"${name}" was moved or replaced during the delete, so the delete stopped there.`,
  )

// Every entry under a folder, files first in walk order and folders deepest
// first, so removing them in this order only ever removes an empty folder.
// Each folder goes into `listedFolders` as it is read.
const listFolderContents = async ({
  assertFolderUnchanged,
  directoryPath,
  fileSystem,
  listedFolders,
  onEntryFound,
  signal,
}: {
  assertFolderUnchanged: (
    folderPath: string,
  ) => Promise<void>
  directoryPath: string
  fileSystem: DeleteFileSystem
  listedFolders: Map<string, ListedFolder>
  onEntryFound: (entryCount: number) => void
  signal: AbortSignal
}): Promise<{
  directoryPaths: ListedEntry[]
  filePaths: ListedEntry[]
} | null> => {
  const filePaths: ListedEntry[] = []
  const directoryPaths: ListedEntry[] = []
  const pendingDirectories: ListedEntry[] = [
    { parentPath: "", path: directoryPath },
  ]

  while (pendingDirectories.length > 0) {
    if (signal.aborted) {
      return null
    }

    const nextDirectory = pendingDirectories.shift()

    if (nextDirectory === undefined) {
      break
    }

    // A folder found earlier is checked again just before it is read. If it
    // became a link in the meantime, reading it would walk into the tree the
    // link points at, so it is removed as a link instead. The top folder was
    // already identified, so it only has to still be that folder.
    if (nextDirectory.path === directoryPath) {
      await assertFolderUnchanged(directoryPath)
    } else {
      await assertFolderUnchanged(nextDirectory.parentPath)

      const info = await fileSystem.getEntryInfo(
        nextDirectory.path,
      )

      // The folders above must still be the listed ones after the lookup
      // too. Otherwise a swap during the lookup would record the identity of
      // a folder in another tree as this folder's.
      await assertFolderUnchanged(nextDirectory.parentPath)

      if (!info.isDirectory) {
        directoryPaths.splice(
          directoryPaths.indexOf(nextDirectory),
          1,
        )
        filePaths.push(nextDirectory)

        continue
      }

      listedFolders.set(nextDirectory.path, {
        identity: info.identity,
        parentPath: nextDirectory.parentPath,
      })
    }

    const entries = await fileSystem.listDirectory(
      nextDirectory.path,
    )

    for (const entry of entries) {
      const listedEntry = {
        parentPath: nextDirectory.path,
        path: entry.path,
      }

      if (entry.isDirectory) {
        directoryPaths.push(listedEntry)
        pendingDirectories.push(listedEntry)
      } else {
        filePaths.push(listedEntry)
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

// The error a filesystem gives for removing a folder that is not empty.
// Node uses ENOTEMPTY, and some platforms use EEXIST for the same thing.
export const isFolderNotEmptyError = (error: unknown) =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "ENOTEMPTY" || error.code === "EEXIST")

// How many times one folder is listed again when something new appeared in
// it during the delete, before the delete gives up on it.
const maxFolderRelistCount = 3

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

  // Every folder listed so far, from the item being deleted down. Before
  // anything inside a folder is removed, that folder and every folder above
  // it, up to the item, must still be real folders (not links) with the
  // identity they had when listed. A folder at any level swapped for a link,
  // or moved, would otherwise send a removal by the old path into another
  // tree. Checking every level also covers a disk that gives no identity,
  // because a link at any level shows as a link. A tiny window remains
  // between this check and the removal itself, which Node offers no way to
  // close.
  const listedFolders = new Map<string, ListedFolder>()

  const getFolderChain = (folderPath: string) => {
    const folderChain: [string, ListedFolder][] = []
    let chainPath: string | null = folderPath

    while (chainPath !== null) {
      const listedFolder = listedFolders.get(chainPath)

      if (!listedFolder) {
        throw new Error(
          `"${fileSystem.basename(chainPath)}" was never listed.`,
        )
      }

      folderChain.push([chainPath, listedFolder])
      chainPath = listedFolder.parentPath
    }

    return folderChain
  }

  // The lookups run together, so a deeper folder costs no more waiting than
  // one directly inside the item.
  const assertFolderUnchanged = async (
    folderPath: string,
  ) => {
    await Promise.all(
      getFolderChain(folderPath).map(
        async ([chainPath, listedFolder]) => {
          const info =
            await fileSystem.getEntryInfo(chainPath)

          if (
            !info.isDirectory ||
            (listedFolder.identity !== null &&
              info.identity !== listedFolder.identity)
          ) {
            throw createFolderChangedError(
              fileSystem.basename(chainPath),
            )
          }
        },
      ),
    )
  }

  const toStoppedResult = () => ({
    entriesRemoved,
    entriesTotal,
    errorMessage: null,
    outcome:
      entriesRemoved === 0
        ? ("notDeleted" as const)
        : ("partlyDeleted" as const),
  })

  const reportRemoval = (
    currentPath: string,
    isForced = false,
  ) => {
    reportProgress(
      {
        ...baseProgress,
        currentPath,
        entriesDone: entriesRemoved,
        entriesTotal,
        phase: "removing",
      },
      { isForced },
    )
  }

  // Removes files from a shared index with a small pool of workers. Each one
  // checks Stop before it takes the next file, so Stop halts the run after
  // at most `removalConcurrency` files that were already under way.
  const removeFiles = async (filePaths: ListedEntry[]) => {
    let nextFileIndex = 0
    let firstError: unknown = null

    const removeNextFiles = async () => {
      while (
        !signal.aborted &&
        firstError === null &&
        nextFileIndex < filePaths.length
      ) {
        const listedFile = filePaths[nextFileIndex]

        nextFileIndex += 1

        if (!listedFile) {
          break
        }

        try {
          await assertFolderUnchanged(listedFile.parentPath)

          if (signal.aborted) {
            break
          }

          await fileSystem.removeFile(listedFile.path)

          entriesRemoved += 1

          reportRemoval(listedFile.path)
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
            Math.min(removalConcurrency, filePaths.length),
          ),
        },
        removeNextFiles,
      ),
    )

    if (firstError !== null) {
      throw firstError
    }
  }

  // Lists a folder and removes everything inside it, deepest first. Resolves
  // to false when Stop ended it early.
  const removeFolderContents = async (
    folderPath: string,
    relistCount: number,
  ): Promise<boolean> => {
    const entriesBefore = entriesTotal ?? 0

    reportProgress({
      ...baseProgress,
      entriesDone: entriesRemoved,
      entriesTotal: null,
      phase: "listing",
    })

    const contents = await listFolderContents({
      assertFolderUnchanged,
      directoryPath: folderPath,
      fileSystem,
      listedFolders,
      onEntryFound: (entryCount) => {
        reportProgress({
          ...baseProgress,
          // The count found so far rides in `entriesDone` while listing.
          entriesDone: entryCount,
          entriesTotal: null,
          phase: "listing",
        })
      },
      signal,
    })

    if (!contents) {
      return false
    }

    entriesTotal =
      entriesBefore +
      contents.filePaths.length +
      contents.directoryPaths.length

    reportRemoval(folderPath, true)

    await removeFiles(contents.filePaths)

    for (const listedFolder of contents.directoryPaths) {
      if (signal.aborted) {
        return false
      }

      const isRemoved = await removeEmptiedFolder(
        listedFolder.path,
        listedFolder.parentPath,
        relistCount,
      )

      if (!isRemoved) {
        return false
      }
    }

    return !signal.aborted
  }

  // Removes a folder that should now be empty. When something appeared in it
  // after it was listed (Explorer drops a `Thumbs.db`, another program saves
  // a file), the folder is listed again and its new entries go through the
  // same counted, stoppable removal, never one opaque recursive call.
  const removeEmptiedFolder = async (
    folderPath: string,
    parentPath: string | null,
    relistCount: number,
  ): Promise<boolean> => {
    if (parentPath !== null) {
      await assertFolderUnchanged(parentPath)

      // Stop may have arrived during that lookup.
      if (signal.aborted) {
        return false
      }
    }

    try {
      await fileSystem.removeDirectory(folderPath)
    } catch (error) {
      if (
        !isFolderNotEmptyError(error) ||
        relistCount >= maxFolderRelistCount
      ) {
        throw error
      }

      const isEmptied = await removeFolderContents(
        folderPath,
        relistCount + 1,
      )

      return isEmptied
        ? removeEmptiedFolder(
            folderPath,
            parentPath,
            relistCount + 1,
          )
        : false
    }

    entriesRemoved += 1

    reportRemoval(folderPath)

    return true
  }

  try {
    const info = await fileSystem.getEntryInfo(
      target.filePath,
    )

    // Stop may have arrived while the entry was being looked up.
    if (signal.aborted) {
      return toStoppedResult()
    }

    if (!info.isDirectory) {
      entriesTotal = 1

      reportRemoval(target.filePath, true)

      await fileSystem.removeFile(target.filePath)

      entriesRemoved = 1

      return {
        entriesRemoved,
        entriesTotal,
        errorMessage: null,
        outcome: "deletedPermanently",
      }
    }

    // The folder itself is the last entry.
    entriesTotal = 1

    listedFolders.set(target.filePath, {
      identity: info.identity,
      parentPath: null,
    })

    const isEmptied = await removeFolderContents(
      target.filePath,
      0,
    )

    if (
      !isEmptied ||
      !(await removeEmptiedFolder(target.filePath, null, 0))
    ) {
      return toStoppedResult()
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
