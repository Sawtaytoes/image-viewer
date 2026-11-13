import { ProgressBar } from "@charcuterie/ui"
import type { Ref } from "react"

import type { DeleteProgress } from "../../deleting/deleteItems"
import { getDeleteProgressValue } from "./deleteDialogState"
import {
  describeItemPosition,
  describeProgress,
  describeStopping,
  stopNote,
} from "./deleteItemsText"

// The running delete: which item, how far, the entry being removed now, and
// what Stop can and cannot do.
//
// It takes focus while the delete runs (`tabIndex={-1}`), so an Enter that is
// still held from the question can never land on the Stop button.
const DeleteProgressPanel = ({
  getName,
  isStopRequested,
  itemCount,
  panelRef,
  progress,
  trashName,
}: {
  getName: (filePath: string) => string
  isStopRequested: boolean
  itemCount: number
  panelRef: Ref<HTMLDivElement>
  progress: DeleteProgress | null
  trashName: string
}) => {
  const progressValue = getDeleteProgressValue(
    progress,
    itemCount,
  )

  return (
    <div
      className="flex animate-fade-in flex-col gap-3 outline-none"
      ref={panelRef}
      tabIndex={-1}
    >
      {progress && progress.itemCount > 1 && (
        <p className="break-all font-semibold text-content-primary text-lg">
          {describeItemPosition(progress)}
        </p>
      )}

      <ProgressBar
        isIndeterminate={progressValue === null}
        label="Delete progress"
        max={progressValue?.max ?? 1}
        size="lg"
        value={progressValue?.value ?? 0}
      />

      <p className="text-content-primary text-md">
        {describeProgress(progress, trashName)}
      </p>

      {progress?.phase === "removing" &&
        progress.currentPath !== null && (
          <p className="truncate text-content-muted text-sm">
            Now: {getName(progress.currentPath)}
          </p>
        )}

      <p
        aria-live="polite"
        className="text-content-secondary text-sm"
      >
        {isStopRequested
          ? describeStopping(progress, trashName)
          : stopNote}
      </p>
    </div>
  )
}

export default DeleteProgressPanel
