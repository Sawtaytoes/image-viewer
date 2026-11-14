import type { RefObject } from "react"
import { useEffect } from "react"

// Where a clickable `<div>` became a `<button>` inside a plain wrapper, a press
// on one child and a release on another (the folder tab's name, then its close
// button) make a `click` on the wrapper itself, the nearest element that holds
// both. The `<div>` handled that click; this hook handles it on the wrapper, so
// those presses still do what they did. Only a click whose target is the
// wrapper itself counts: the children's own clicks go to their buttons.
//
// It is a pointer gesture only, so it is a plain listener, not a React handler
// on a `<div>`: the keyboard reaches the same action through the buttons.
const useOwnClick = (
  elementRef: RefObject<HTMLElement | null>,
  onOwnClick: (event: MouseEvent) => void,
) => {
  useEffect(() => {
    const element = elementRef.current

    if (!element) {
      return
    }

    const onClick = (event: MouseEvent) => {
      if (event.target === element) {
        onOwnClick(event)
      }
    }

    element.addEventListener("click", onClick)

    return () => {
      element.removeEventListener("click", onClick)
    }
  }, [elementRef, onOwnClick])
}

export default useOwnClick
