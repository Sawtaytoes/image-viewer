import type {
  QueuedFolder,
  SavedPane,
  SavedQueue,
} from "./types"

// Reads a saved queue slot, whatever wrote it. Shared by main (the file in
// userData) and the browser harness (`localStorage`), so both accept the same
// shapes: the current object, or the bare folder array every slot was before
// positions and columns were saved. Anything unusable reads as no slot.
const isQueuedFolder = (
  value: unknown,
): value is QueuedFolder =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as QueuedFolder).id === "string" &&
  typeof (value as QueuedFolder).path === "string" &&
  typeof (value as QueuedFolder).name === "string"

const isImageIndex = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0

const readPanes = (value: unknown): SavedPane[] =>
  Array.isArray(value)
    ? value.flatMap((pane) =>
        typeof pane === "object" &&
        pane !== null &&
        isImageIndex(pane.currentIndex) &&
        (pane.folderPath === null ||
          typeof pane.folderPath === "string")
          ? [
              {
                currentIndex: pane.currentIndex,
                folderPath: pane.folderPath,
              },
            ]
          : [],
      )
    : []

const readLastIndexByPath = (
  value: unknown,
): Record<string, number> =>
  typeof value === "object" && value !== null
    ? Object.fromEntries(
        Object.entries(value).filter(([, index]) =>
          isImageIndex(index),
        ),
      )
    : {}

const normalizeSavedQueue = (
  raw: unknown,
): SavedQueue | null => {
  if (Array.isArray(raw)) {
    return {
      activePaneIndex: null,
      folders: raw.filter(isQueuedFolder),
      lastIndexByPath: {},
      panes: [],
    }
  }

  if (
    typeof raw !== "object" ||
    raw === null ||
    !Array.isArray((raw as SavedQueue).folders)
  ) {
    return null
  }

  const saved = raw as Record<string, unknown>
  const panes = readPanes(saved.panes)

  return {
    activePaneIndex:
      isImageIndex(saved.activePaneIndex) &&
      saved.activePaneIndex < panes.length
        ? saved.activePaneIndex
        : null,
    folders: (saved.folders as unknown[]).filter(
      isQueuedFolder,
    ),
    lastIndexByPath: readLastIndexByPath(
      saved.lastIndexByPath,
    ),
    panes,
  }
}

export default normalizeSavedQueue
