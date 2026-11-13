import { Button, Dialog } from "@charcuterie/ui"
import { useEffect, useRef } from "react"

import useKeyboardControls from "../convenience/useKeyboardControls"
import DeleteConfirmList from "./DeleteConfirmList"
import DeleteProgressPanel from "./DeleteProgressPanel"
import DeleteReportList from "./DeleteReportList"
import type { DeleteDialogState } from "./deleteDialogState"
import {
  getConfirmHeading,
  getReportHeading,
  getRunningHeading,
} from "./deleteItemsText"

// The two buttons of the question splay to opposite ends. That is the mis-tap
// guard the delete-confirmation decision asks for in layout form
// (`docs/decisions/2026-06-03-delete-needs-confirmation-and-guards-stray-delete-key.md`).
// Stop sits where "No" was, at the far end from "Yes", so a second tap on
// "Yes" never lands on it.
const confirmFooterClassName =
  "flex w-full items-center justify-between gap-4"

const stopFooterClassName =
  "flex w-full items-center justify-start gap-4"

const reportFooterClassName =
  "flex w-full items-center justify-end gap-4"

// Enter on a focused button already clicks it. The window-level Enter below is
// for the rest of the dialog, so it must not click a second thing.
const isButtonFocused = () =>
  document.activeElement?.tagName === "BUTTON"

// One dialog, three phases: the question (what will be removed, with counts
// and size), the running delete (progress and Stop), and the report (what was
// removed and how). See
// `docs/decisions/2026-11-13-delete-shows-what-it-removes-with-progress-and-a-stop-button.md`.
const DeleteItemsDialog = ({
  getName,
  onCloseReport,
  onConfirm,
  onDecline,
  onStop,
  state,
  trashName,
}: {
  getName: (filePath: string) => string
  onCloseReport: () => void
  onConfirm: () => void
  onDecline: () => void
  onStop: () => void
  state: DeleteDialogState
  trashName: string
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const progressPanelRef = useRef<HTMLDivElement>(null)
  const doneButtonRef = useRef<HTMLButtonElement>(null)

  // Each phase puts focus where Enter should act: "Yes" for the question,
  // nothing clickable while the delete runs, "Done" for the report.
  useEffect(() => {
    if (state.phase === "running") {
      progressPanelRef.current?.focus()
    } else if (state.phase === "finished") {
      doneButtonRef.current?.focus()
    }
  }, [state.phase])

  // [Enter] answers yes and [Backspace] answers no, as the confirmation
  // decision asks; [Escape] and an outside press arrive through `onClose`.
  useKeyboardControls((event: KeyboardEvent) => {
    if (state.phase === "confirming") {
      if (event.code === "Backspace") {
        onDecline()
      } else if (
        event.code === "Enter" &&
        !isButtonFocused()
      ) {
        onConfirm()
      }
    } else if (
      state.phase === "finished" &&
      event.code === "Enter" &&
      !isButtonFocused()
    ) {
      onCloseReport()
    }
  })

  if (state.phase === "hidden") {
    return (
      <Dialog
        heading="Delete"
        isVisible={false}
        onClose={onDecline}
      />
    )
  }

  if (state.phase === "confirming") {
    return (
      <Dialog
        footer={
          <div className={confirmFooterClassName}>
            <Button
              intent="danger"
              onClick={onDecline}
              size="lg"
            >
              No
            </Button>

            <Button
              intent="success"
              onClick={onConfirm}
              ref={confirmButtonRef}
              size="lg"
            >
              Yes
            </Button>
          </div>
        }
        heading={getConfirmHeading(state.targets, getName)}
        initialFocus={confirmButtonRef}
        isVisible
        onClose={onDecline}
      >
        <DeleteConfirmList
          getName={getName}
          summary={state.summary}
          summaryErrorMessage={state.summaryErrorMessage}
          targets={state.targets}
          trashName={trashName}
        />
      </Dialog>
    )
  }

  if (state.phase === "running") {
    return (
      <Dialog
        footer={
          <div className={stopFooterClassName}>
            <Button
              intent="danger"
              isDisabled={state.isStopRequested}
              onClick={onStop}
              size="lg"
            >
              {state.isStopRequested ? "Stopping…" : "Stop"}
            </Button>
          </div>
        }
        heading={getRunningHeading(state.targets, getName)}
        // Escape or an outside press must not hide a delete that is still
        // running; Stop is the way out.
        isDismissable={false}
        isVisible
        onClose={onStop}
      >
        <DeleteProgressPanel
          getName={getName}
          isStopRequested={state.isStopRequested}
          itemCount={state.targets.length}
          panelRef={progressPanelRef}
          progress={state.progress}
          trashName={trashName}
        />
      </Dialog>
    )
  }

  return (
    <Dialog
      footer={
        <div className={reportFooterClassName}>
          <Button
            intent="accent"
            onClick={onCloseReport}
            ref={doneButtonRef}
            size="lg"
          >
            Done
          </Button>
        </div>
      }
      heading={getReportHeading(state.result)}
      isVisible
      onClose={onCloseReport}
    >
      <DeleteReportList
        result={state.result}
        trashName={trashName}
      />
    </Dialog>
  )
}

export default DeleteItemsDialog
