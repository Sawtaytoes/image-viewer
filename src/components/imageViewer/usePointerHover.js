import { useEffect, useRef } from "react"

// Hover engages only on a real boundary crossing (`pointerenter`). We
// deliberately do NOT treat `pointermove` as hover: when an image opens under a
// stationary cursor (e.g. tapping a gallery thumbnail), the nav edge sitting
// under the pointer would otherwise light up on the first stray move. A mouse
// `pointerup` keeps the hover (the cursor is still parked there); a touch/pen
// `pointerup` — and `pointercancel` — clears it, since touch fires no reliable
// `pointerout` once the contact is gone (the old "stuck edge" mode).
const getIsHovering = (event) => {
  switch (event.type) {
    case "pointerenter":
      return true

    case "pointerup":
      return event.pointerType === "mouse"

    default:
      return false
  }
}

const usePointerHover = ({ callback, domElementRef }) => {
  const callbackRef = useRef()

  callbackRef.current = callback

  useEffect(() => {
    const hoverStateNotification = (event) => {
      callbackRef.current({
        event,
        isHovering: getIsHovering(event),
      })
    }

    const domElement = domElementRef.current

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
    }
  }, [domElementRef])
}

export default usePointerHover
