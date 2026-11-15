import type { MouseEventHandler } from "react"
import { memo, useCallback } from "react"

import AddIcon from "../icons/AddIcon"
import getTapPoint from "./getTapPoint"
import type { TapPoint } from "./TapFeedback"

interface EmptyPaneAffordanceProps {
  // No point when the affordance was activated from the keyboard.
  onActivate: (point?: TapPoint) => void
}

// Presentational: just the `+`/label. The owning Pane opens the per-column menu
// (FolderPickerPopover) from the activation point.
const EmptyPaneAffordance = ({
  onActivate,
}: EmptyPaneAffordanceProps) => {
  // `click`, not `pointerdown`: opening the menu over this affordance must not
  // let the same tap's trailing events reach what's underneath.
  const onActivateClick = useCallback<
    MouseEventHandler<HTMLButtonElement>
  >(
    (event) => {
      event.stopPropagation()

      onActivate(getTapPoint(event))
    },
    [onActivate],
  )

  // A real `<button>`, so Enter or Space on it opens the menu as a tap does.
  // Tailwind's preflight strips the button's own background, border and
  // padding, so it paints as the `<div>` it replaced.
  return (
    <button
      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 font-light text-content-muted"
      data-tap-surface
      onClick={onActivateClick}
      type="button"
    >
      <AddIcon />

      <span className="text-lg">Tap to pick folder</span>
    </button>
  )
}

const MemoizedEmptyPaneAffordance = memo(
  EmptyPaneAffordance,
)

export default MemoizedEmptyPaneAffordance
