import { useCallback, useState } from "react"

// The two indicators `TapFeedback` can paint: a grid glyph for "close back to
// gallery", a chevron for "chrome revealed".
export type TapFeedbackVariant = "close" | "reveal"

// One in-flight instance. `x`/`y` are viewport coordinates of the tap.
export interface TapFeedbackInstance {
  id: string
  variant: TapFeedbackVariant
  x: number
  y: number
}

export type SpawnTapFeedback = Omit<
  TapFeedbackInstance,
  "id"
>

// Owns the list of in-flight tap-feedback instances. `spawn` pushes one at a
// touch point; `remove` prunes it once its animation finishes (TapFeedback
// calls back on `onAnimationEnd`). Kept on the viewer so feedback outlives the
// pane/image that triggered it.
const useTapFeedback = () => {
  const [feedback, setFeedback] = useState<
    TapFeedbackInstance[]
  >([])

  const spawn = useCallback(
    ({ variant, x, y }: SpawnTapFeedback) => {
      setFeedback((previousFeedback) => [
        ...previousFeedback,
        { id: crypto.randomUUID(), variant, x, y },
      ])
    },
    [],
  )

  const remove = useCallback((id: string) => {
    setFeedback((previousFeedback) =>
      previousFeedback.filter((item) => item.id !== id),
    )
  }, [])

  return {
    feedback,
    remove,
    spawn,
  }
}

export default useTapFeedback
