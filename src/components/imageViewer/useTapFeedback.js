import { useCallback, useState } from "react"

// Owns the list of in-flight tap-feedback instances. `spawn` pushes one at a
// touch point; `remove` prunes it once its animation finishes (TapFeedback
// calls back on `onAnimationEnd`). Kept on the viewer so feedback outlives the
// pane/image that triggered it.
const useTapFeedback = () => {
  const [feedback, setFeedback] = useState([])

  const spawn = useCallback(({ variant, x, y }) => {
    setFeedback((previousFeedback) => [
      ...previousFeedback,
      { id: crypto.randomUUID(), variant, x, y },
    ])
  }, [])

  const remove = useCallback((id) => {
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
