import { useEffect, useRef } from "react"

// A mouse stays parked over the element after a click, so a `pointerup` keeps
// it "hovering". A touch/pen lifts off — and reliably fires neither
// `pointerout` nor `pointerleave` once the contact is gone — so its
// `pointerup`/`pointercancel` must clear the hover, otherwise the nav overlay
// stays stuck at its hovered opacity (the "weird stuck mode" on the edges).
const getIsHovering = (event) => {
  switch (event.type) {
    case "pointerenter":
    case "pointermove":
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

    const onPointerInitialMovement = (event) => {
      hoverStateNotification(event)

      domElement.removeEventListener(
        "pointermove",
        onPointerInitialMovement,
      )
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
      "pointermove",
      onPointerInitialMovement,
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
        "pointermove",
        onPointerInitialMovement,
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
