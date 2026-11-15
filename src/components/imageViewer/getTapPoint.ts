import type { MouseEvent } from "react"

import type { TapPoint } from "./TapFeedback"

// Where a `click` landed, for the tap ripple — or nothing when no pointer made
// it. A pointer `click` (mouse, touch or pen) carries its click count in
// `detail`, so it is at least 1. Enter or Space on a focused `<button>` fires a
// `click` with `detail` 0 and `clientX`/`clientY` 0, which would put the ripple
// in the window's top-left corner. With no point, the caller skips the ripple
// and runs the action alone, the same as its keyboard shortcut does.
const getTapPoint = (
  event: Pick<MouseEvent, "clientX" | "clientY" | "detail">,
): TapPoint | undefined =>
  event.detail === 0
    ? undefined
    : { x: event.clientX, y: event.clientY }

export default getTapPoint
