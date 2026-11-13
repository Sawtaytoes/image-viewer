import type {
  DeleteJobResult,
  DeleteProgress,
  DeleteSummary,
  DeleteTarget,
} from "../../deleting/deleteItems"

// The delete dialog moves through three phases: the question, the running
// delete, and the report. One reducer owns that, so every stale message (a
// summary for a question already answered, progress for a job already
// finished) is dropped in one place.

export type DeleteDialogState =
  | { phase: "hidden" }
  | {
      phase: "confirming"
      summary: DeleteSummary | null
      summaryErrorMessage: string | null
      targets: readonly DeleteTarget[]
    }
  | {
      isStopRequested: boolean
      jobId: string
      phase: "running"
      progress: DeleteProgress | null
      summary: DeleteSummary | null
      targets: readonly DeleteTarget[]
    }
  | {
      phase: "finished"
      result: DeleteJobResult
      targets: readonly DeleteTarget[]
    }

export type DeleteDialogAction =
  | { targets: readonly DeleteTarget[]; type: "opened" }
  | {
      summary: DeleteSummary
      targets: readonly DeleteTarget[]
      type: "summarized"
    }
  | {
      errorMessage: string
      targets: readonly DeleteTarget[]
      type: "summaryFailed"
    }
  | { jobId: string; type: "started" }
  | {
      jobId: string
      progress: DeleteProgress
      type: "progressed"
    }
  | { type: "stopRequested" }
  | {
      jobId: string
      result: DeleteJobResult
      type: "finished"
    }
  | { type: "closed" }

export const hiddenDeleteDialogState: DeleteDialogState = {
  phase: "hidden",
}

export const deleteDialogReducer = (
  state: DeleteDialogState,
  action: DeleteDialogAction,
): DeleteDialogState => {
  switch (action.type) {
    case "opened":
      return state.phase === "hidden"
        ? {
            phase: "confirming",
            summary: null,
            summaryErrorMessage: null,
            targets: action.targets,
          }
        : state

    case "summarized":
      return (state.phase === "confirming" ||
        state.phase === "running") &&
        state.targets === action.targets
        ? { ...state, summary: action.summary }
        : state

    case "summaryFailed":
      return state.phase === "confirming" &&
        state.targets === action.targets
        ? {
            ...state,
            summaryErrorMessage: action.errorMessage,
          }
        : state

    case "started":
      return state.phase === "confirming"
        ? {
            isStopRequested: false,
            jobId: action.jobId,
            phase: "running",
            progress: null,
            summary: state.summary,
            targets: state.targets,
          }
        : state

    case "progressed":
      return state.phase === "running" &&
        state.jobId === action.jobId
        ? { ...state, progress: action.progress }
        : state

    case "stopRequested":
      return state.phase === "running"
        ? { ...state, isStopRequested: true }
        : state

    case "finished":
      return state.phase === "running" &&
        state.jobId === action.jobId
        ? {
            phase: "finished",
            result: action.result,
            targets: state.targets,
          }
        : state

    case "closed":
      // A running delete cannot be closed away: its window would lose the
      // only Stop button. Stop it, and close the report when it arrives.
      return state.phase === "running"
        ? state
        : hiddenDeleteDialogState

    default:
      return state
  }
}

// How far along the whole delete is, as `value` out of `max` for a progress
// bar, or null while there is nothing to measure yet (one item, still in the
// trash or still being listed).
export const getDeleteProgressValue = (
  progress: DeleteProgress | null,
  itemCount: number,
): { max: number; value: number } | null => {
  if (!progress) {
    return itemCount > 1
      ? { max: itemCount, value: 0 }
      : null
  }

  const isMeasurable =
    progress.phase === "removing" &&
    progress.entriesTotal !== null &&
    progress.entriesTotal > 0

  if (!isMeasurable && progress.itemCount <= 1) {
    return null
  }

  const itemFraction =
    isMeasurable && progress.entriesTotal
      ? Math.min(
          1,
          progress.entriesDone / progress.entriesTotal,
        )
      : 0

  return {
    max: progress.itemCount,
    value: progress.itemIndex + itemFraction,
  }
}

// A job id unique across every window, since main tracks all of their jobs in
// one map.
export const createDeleteJobId = () =>
  `delete-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`

// A result for a delete whose job never answered (the IPC call itself threw),
// so the report can still say what happened: nothing it can vouch for.
export const createUnansweredDeleteResult = (
  targets: readonly DeleteTarget[],
  errorMessage: string,
  getName: (filePath: string) => string,
): DeleteJobResult => ({
  isStopped: false,
  items: targets.map(({ filePath, isDirectory }) => ({
    entriesRemoved: 0,
    entriesTotal: null,
    errorMessage,
    filePath,
    isDirectory,
    name: getName(filePath),
    outcome: "failed",
    trashErrorMessage: null,
  })),
})
