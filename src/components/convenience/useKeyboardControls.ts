import { useEffect, useRef } from "react"

// A window-level `keydown` subscription whose handler can change every render
// without resubscribing. The listener is the real DOM one, so the callback
// takes a DOM `KeyboardEvent` — not React's synthetic event, which never
// reaches a `window.addEventListener` handler.
type KeyboardControlsCallback = (
  event: KeyboardEvent,
) => void

const useKeyboardControls = (
  callback: KeyboardControlsCallback,
) => {
  const callbackRef =
    useRef<KeyboardControlsCallback>(callback)

  callbackRef.current = callback

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      callbackRef.current(event)
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])
}

export default useKeyboardControls
