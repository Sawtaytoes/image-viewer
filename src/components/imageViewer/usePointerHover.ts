import type { RefObject } from "react"
import { useEffect, useRef } from "react"

// What the callback receives: the event that changed the hover state (a pointer
// event from the element, or the window `blur` that force-clears it) and the
// resulting state.
export interface PointerHoverNotification {
  event: FocusEvent | PointerEvent
  isHovering: boolean
}

export interface UsePointerHoverOptions {
  callback: (notification: PointerHoverNotification) => void
  domElementRef: RefObject<HTMLElement | null>
}

// Hover engages only on a real boundary crossing (`pointerenter`). We
// deliberately do NOT treat `pointermove` as hover: when an image opens under a
// stationary cursor (e.g. tapping a gallery thumbnail), the nav edge sitting
// under the pointer would otherwise light up on the first stray move. A mouse
// `pointerup` keeps the hover (the cursor is still parked there); a touch/pen
// `pointerup` — and `pointercancel` — clears it, since touch fires no reliable
// `pointerout` once the contact is gone (the old "stuck edge" mode).
const getIsHovering = (event: PointerEvent) => {
  switch (event.type) {
    case "pointerenter":
      return true

    case "pointerup":
      return event.pointerType === "mouse"

    default:
      return false
  }
}

const usePointerHover = ({
  callback,
  domElementRef,
}: UsePointerHoverOptions) => {
  const callbackRef = useRef(callback)

  callbackRef.current = callback

  useEffect(() => {
    const hoverStateNotification = (
      event: PointerEvent,
    ) => {
      callbackRef.current({
        event,
        isHovering: getIsHovering(event),
      })
    }

    // Force-clear hover regardless of the event type. Used for `window` blur,
    // where no `pointerleave`/`pointerout` is delivered while the pointer sits
    // over the edge — so the overlay would otherwise stay lit ("stuck edge")
    // until a real boundary crossing re-arms it.
    const clearHover = (event: FocusEvent) => {
      callbackRef.current({ event, isHovering: false })
    }

    const domElement = domElementRef.current

    if (!domElement) {
      return undefined
    }

    domElement.addEventListener(
      "pointerup",
      hoverStateNotification,
    )

    domElement.addEventListener(
      "pointerenter",
      hoverStateNotification,
    )

    domElement.addEventListener(
      "pointerout",
      hoverStateNotification,
    )

    domElement.addEventListener(
      "pointercancel",
      hoverStateNotification,
    )

    window.addEventListener("blur", clearHover)

    return () => {
      domElement.removeEventListener(
        "pointerup",
        hoverStateNotification,
      )

      domElement.removeEventListener(
        "pointerenter",
        hoverStateNotification,
      )

      domElement.removeEventListener(
        "pointerout",
        hoverStateNotification,
      )

      domElement.removeEventListener(
        "pointercancel",
        hoverStateNotification,
      )

      window.removeEventListener("blur", clearHover)
    }
  }, [domElementRef])
}

export default usePointerHover
