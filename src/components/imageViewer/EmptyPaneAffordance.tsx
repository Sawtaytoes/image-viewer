import type { MouseEventHandler } from "react"
import { memo, useCallback } from "react"

import AddIcon from "../icons/AddIcon"
import type { TapPoint } from "./TapFeedback"

interface EmptyPaneAffordanceProps {
  onActivate: (point: TapPoint) => void
}

// Presentational: just the `+`/label. The owning Pane opens the per-column menu
// (FolderPickerPopover) from the activation point.
const EmptyPaneAffordance = ({
  onActivate,
}: EmptyPaneAffordanceProps) => {
  // `click`, not `pointerdown`: opening the menu over this affordance must not
  // let the same tap's trailing events reach what's underneath.
  const onActivateClick = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(
    (event) => {
      event.stopPropagation()

      onActivate({ x: event.clientX, y: event.clientY })
    },
    [onActivate],
  )

  return (
    <div
      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 font-light text-content-muted"
      onClick={onActivateClick}
    >
      <AddIcon />

      <div className="text-[18px]">Tap to pick folder</div>
    </div>
  )
}

const MemoizedEmptyPaneAffordance = memo(
  EmptyPaneAffordance,
)

export default MemoizedEmptyPaneAffordance
