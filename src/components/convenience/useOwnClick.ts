import type { RefObject } from "react"
import { useEffect } from "react"

// Where a clickable `<div>` became a `<button>` inside a plain wrapper, some
// clicks still land on the wrapper itself. A press on one child and a release
// on another (the menu's backdrop, then the menu) clicks the nearest element
// that holds both, and a tap that passes through a child (the folder tab's
// name) clicks the wrapper. The `<div>` handled those clicks. This hook does
// the same for a click whose target is the wrapper itself; the children's own
// clicks go to their buttons.
//
// It listens on the wrapper. React gives every element with an `onClick` prop a
// native `onclick` of its own, so the `<div>` had one, and Chromium moves a
// touch onto the nearest element in the touch area that has a click listener
// (passing over one that holds another). A listener on the wrapper keeps
// touches landing where they did.
//
// It is a pointer path only: the keyboard reaches the same action through the
// wrapper's buttons.
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
