import {
  type ReactNode,
  useCallback,
  useMemo,
  useReducer,
  useRef,
} from "react"

import type {
  DeleteJobResult,
  DeleteTarget,
} from "../../deleting/deleteItems"
import DeleteItemsContext from "./DeleteItemsContext"
import DeleteItemsDialog from "./DeleteItemsDialog"
import {
  createDeleteJobId,
  createUnansweredDeleteResult,
  deleteDialogReducer,
  hiddenDeleteDialogState,
} from "./deleteDialogState"
import { getTrashName } from "./deleteItemsText"

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const getName = (filePath: string) =>
  window.api.path.basename(filePath) || filePath

// Owns the one delete dialog: the question with what will be removed, the
// progress with its Stop button, and the report of what was removed and how.
// It sits above every screen, so a delete keeps its dialog when the popover or
// toolbar that started it goes away.
const DeleteItemsProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [state, dispatch] = useReducer(
    deleteDialogReducer,
    hiddenDeleteDialogState,
  )

  // Whether a request owns the dialog, from the question until its report is
  // closed. A ref, because `requestDelete` must answer a second request at
  // once, before any re-render could tell it.
  const isDialogTakenRef = useRef(false)

  const resolveRequestRef = useRef<
    ((result: DeleteJobResult | null) => void) | null
  >(null)

  const settleRequest = useCallback(
    (result: DeleteJobResult | null) => {
      resolveRequestRef.current?.(result)
      resolveRequestRef.current = null
    },
    [],
  )

  const requestDelete = useCallback(
    (targets: readonly DeleteTarget[]) => {
      if (
        isDialogTakenRef.current ||
        targets.length === 0
      ) {
        return Promise.resolve(null)
      }

      isDialogTakenRef.current = true

      return new Promise<DeleteJobResult | null>(
        (resolve) => {
          resolveRequestRef.current = resolve

          dispatch({ targets, type: "opened" })

          window.api.deleteItems
            .summarize(targets)
            .then((summary) => {
              dispatch({
                summary,
                targets,
                type: "summarized",
              })
            })
            .catch((error: unknown) => {
              dispatch({
                errorMessage: toErrorMessage(error),
                targets,
                type: "summaryFailed",
              })
            })
        },
      )
    },
    [],
  )

  const decline = useCallback(() => {
    if (state.phase !== "confirming") {
      return
    }

    dispatch({ type: "closed" })
    isDialogTakenRef.current = false
    settleRequest(null)
  }, [settleRequest, state.phase])

  const confirm = useCallback(() => {
    if (state.phase !== "confirming") {
      return
    }

    const { targets } = state
    const jobId = createDeleteJobId()

    dispatch({ jobId, type: "started" })

    window.api.deleteItems
      .start({ jobId, targets }, (progress) => {
        dispatch({ jobId, progress, type: "progressed" })
      })
      .catch((error: unknown) =>
        createUnansweredDeleteResult(
          targets,
          toErrorMessage(error),
          getName,
        ),
      )
      .then((result) => {
        dispatch({ jobId, result, type: "finished" })
        settleRequest(result)
      })
  }, [settleRequest, state])

  const stop = useCallback(() => {
    if (state.phase !== "running") {
      return
    }

    dispatch({ type: "stopRequested" })
    window.api.deleteItems.stop(state.jobId)
  }, [state])

  const closeReport = useCallback(() => {
    if (state.phase !== "finished") {
      return
    }

    dispatch({ type: "closed" })
    isDialogTakenRef.current = false
  }, [state.phase])

  const contextValue = useMemo(
    () => ({
      isDeleteDialogVisible: state.phase !== "hidden",
      requestDelete,
    }),
    [requestDelete, state.phase],
  )

  return (
    <DeleteItemsContext.Provider value={contextValue}>
      {children}

      <DeleteItemsDialog
        getName={getName}
        onCloseReport={closeReport}
        onConfirm={confirm}
        onDecline={decline}
        onStop={stop}
        state={state}
        trashName={getTrashName(window.api.platform)}
      />
    </DeleteItemsContext.Provider>
  )
}

export default DeleteItemsProvider
