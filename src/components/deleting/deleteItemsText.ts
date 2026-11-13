import type {
  DeleteItemResult,
  DeleteJobResult,
  DeleteProgress,
  DeleteSummary,
  DeleteSummaryItem,
  DeleteTarget,
} from "../../deleting/deleteItems"

// Every sentence the delete dialog shows, as pure functions, so the wording
// is testable without rendering the dialog.

const numberFormat = new Intl.NumberFormat("en-US")

export const formatCount = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) =>
  `${numberFormat.format(count)} ${count === 1 ? singular : plural}`

const byteUnits = ["KB", "MB", "GB", "TB"]

// Binary units with Explorer's labels, so a size here matches the size the
// owner sees in Windows.
export const formatByteSize = (byteCount: number) => {
  if (byteCount < 1024) {
    return formatCount(byteCount, "byte")
  }

  let size = byteCount / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < byteUnits.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const digits = size < 10 ? 1 : 0

  return `${size.toFixed(digits)} ${byteUnits[unitIndex]}`
}

// What the OS calls its trash. Windows is the platform this app is for.
export const getTrashName = (platform: string) =>
  platform === "win32" ? "Recycle Bin" : "trash"

const quote = (name: string) => `“${name}”`

export const getConfirmHeading = (
  targets: readonly DeleteTarget[],
  getName: (filePath: string) => string,
) => {
  const [firstTarget] = targets

  if (targets.length === 1 && firstTarget) {
    return `Delete the ${firstTarget.isDirectory ? "folder" : "file"} ${quote(getName(firstTarget.filePath))}?`
  }

  const isEveryTargetAFolder = targets.every(
    ({ isDirectory }) => isDirectory,
  )

  const isEveryTargetAFile = targets.every(
    ({ isDirectory }) => !isDirectory,
  )

  const noun = isEveryTargetAFolder
    ? "folders"
    : isEveryTargetAFile
      ? "files"
      : "items"

  return `Delete these ${numberFormat.format(targets.length)} ${noun}?`
}

const atLeast = (isComplete: boolean) =>
  isComplete ? "" : "at least "

// "120 files, 3 folders, 45 MB" for one item in the confirmation list.
export const describeSummaryItem = (
  item: DeleteSummaryItem,
) => {
  if (item.errorMessage !== null) {
    return `Could not look inside: ${item.errorMessage}`
  }

  if (!item.isDirectory) {
    return formatByteSize(item.totalBytes)
  }

  if (item.fileCount === 0 && item.folderCount === 0) {
    return item.isComplete
      ? "Empty folder"
      : "Counting stopped early"
  }

  const parts = [
    formatCount(item.fileCount, "file"),
    ...(item.folderCount > 0
      ? [formatCount(item.folderCount, "folder")]
      : []),
    formatByteSize(item.totalBytes),
  ]

  return `${atLeast(item.isComplete)}${parts.join(", ")}`
}

// The total line under the list. The folders you picked count as folders
// removed, along with every folder inside them.
export const describeSummaryTotal = (
  summary: DeleteSummary,
) => {
  const folderCount =
    summary.folderCount +
    summary.items.filter(({ isDirectory }) => isDirectory)
      .length

  const parts = [
    formatCount(summary.fileCount, "file"),
    ...(folderCount > 0
      ? [formatCount(folderCount, "folder")]
      : []),
  ]

  return `In all: ${atLeast(summary.isComplete)}${parts.join(" and ")}, ${formatByteSize(summary.totalBytes)}.`
}

// Said under the total when the count hit its budget, so "at least" has a
// reason next to it.
export const describeIncompleteCount = (
  targets: readonly DeleteTarget[],
) =>
  `Counting stopped early, because ${targets.length === 1 ? "this folder is" : "these folders are"} large or slow to read. The delete still removes everything in ${targets.length === 1 ? "it" : "them"}.`

export const getTrashNote = (trashName: string) =>
  `Each item goes to the ${trashName}. Where the ${trashName} is not available, such as on a network share, the item is deleted permanently.`

export const getRunningHeading = (
  targets: readonly DeleteTarget[],
  getName: (filePath: string) => string,
) => {
  const [firstTarget] = targets

  return targets.length === 1 && firstTarget
    ? `Deleting ${quote(getName(firstTarget.filePath))}`
    : `Deleting ${formatCount(targets.length, "item")}`
}

// The sentence under the progress bar: what is happening to the current item.
export const describeProgress = (
  progress: DeleteProgress | null,
  trashName: string,
) => {
  if (!progress) {
    return "Starting…"
  }

  if (progress.phase === "trashing") {
    return `Moving to the ${trashName}…`
  }

  if (progress.phase === "listing") {
    return `The ${trashName} is not available here, so this is a permanent delete. Listing files: ${formatCount(progress.entriesDone, "file or folder", "files and folders")} found so far.`
  }

  return progress.entriesTotal === null
    ? "Deleting permanently…"
    : `Deleting permanently: ${numberFormat.format(progress.entriesDone)} of ${formatCount(progress.entriesTotal, "file or folder", "files and folders")} removed.`
}

export const describeItemPosition = (
  progress: DeleteProgress,
) =>
  `Item ${numberFormat.format(progress.itemIndex + 1)} of ${numberFormat.format(progress.itemCount)}: ${progress.itemName}`

export const stopNote =
  "Stop halts the items that remain. It cannot bring back anything already deleted."

export const describeStopping = (
  progress: DeleteProgress | null,
  trashName: string,
) =>
  progress?.phase === "trashing"
    ? `Stopping. The ${trashName} cannot be interrupted, so the current item finishes first. Nothing after it will be deleted.`
    : "Stopping after the files already under way. Nothing after them will be deleted."

const isRemoved = ({ outcome }: DeleteItemResult) =>
  outcome === "movedToTrash" ||
  outcome === "deletedPermanently"

export const getReportHeading = (
  result: DeleteJobResult,
) => {
  const removedCount = result.items.filter(isRemoved).length
  const [firstItem] = result.items

  if (result.isStopped) {
    return `Delete stopped: ${numberFormat.format(removedCount)} of ${formatCount(result.items.length, "item")} deleted`
  }

  if (removedCount === result.items.length) {
    return result.items.length === 1 && firstItem
      ? `Deleted ${quote(firstItem.name)}`
      : `Deleted ${formatCount(result.items.length, "item")}`
  }

  return result.items.length === 1 && firstItem
    ? `Could not delete ${quote(firstItem.name)}`
    : `${numberFormat.format(result.items.length - removedCount)} of ${formatCount(result.items.length, "item")} not deleted`
}

const describeEntries = (item: DeleteItemResult) =>
  item.entriesTotal === null
    ? formatCount(
        item.entriesRemoved,
        "file or folder",
        "files and folders",
      )
    : `${numberFormat.format(item.entriesRemoved)} of ${formatCount(item.entriesTotal, "file or folder", "files and folders")}`

// One line per item in the report: what happened to it and how.
export const describeOutcome = (
  item: DeleteItemResult,
  trashName: string,
) => {
  switch (item.outcome) {
    case "movedToTrash":
      return `Moved to the ${trashName}.`

    case "deletedPermanently":
      return item.trashErrorMessage === null
        ? "Deleted permanently."
        : `Deleted permanently, because the ${trashName} was not available here.`

    case "partlyDeleted":
      return `Stopped partway: ${describeEntries(item)} were deleted permanently. The rest are still there.`

    case "notDeleted":
      return "Not deleted. It is unchanged."

    case "failed":
      return item.entriesRemoved > 0
        ? `Could not finish: ${item.errorMessage ?? "unknown error"}. ${describeEntries(item)} were already deleted permanently.`
        : `Could not delete: ${item.errorMessage ?? "unknown error"}.`

    default:
      return ""
  }
}
