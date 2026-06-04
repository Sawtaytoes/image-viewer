import { useEffect, useRef } from "react"

const noop = () => {}

// Pointer hook (same `usePointerHover` idiom: callbacks in a ref, listeners on
// `domElementRef`, full teardown). A downward drag that *starts within the top
// edge strip* reveals; an upward drag of similar magnitude dismisses. Touch
// gets implicit pointer capture, so the move keeps reporting after the finger
// leaves the thin strip; `pointerout` is intentionally not an end event here.
const useEdgeSwipe = ({
  domElementRef,
  edgePx = 32,
  thresholdPx = 60,
  onDismiss = noop,
  onProgress = noop,
  onReveal = noop,
}) => {
  const optionsRef = useRef()

  optionsRef.current = {
    edgePx,
    onDismiss,
    onProgress,
    onReveal,
    thresholdPx,
  }

  useEffect(() => {
    const domElement = domElementRef.current

    let isResolved = false
    let pointerId = null
    let startedAtEdge = false
    let startY = 0

    const reset = () => {
      isResolved = false
      pointerId = null
      startedAtEdge = false
    }

    const onPointerDown = (event) => {
      if (pointerId !== null) {
        return
      }

      pointerId = event.pointerId
      startY = event.clientY
      startedAtEdge =
        event.clientY <= optionsRef.current.edgePx
      isResolved = false
    }

    const onPointerMove = (event) => {
      if (
        pointerId === null ||
        event.pointerId !== pointerId ||
        isResolved
      ) {
        return
      }

      const {
        onDismiss,
        onProgress,
        onReveal,
        thresholdPx,
      } = optionsRef.current

      const deltaY = event.clientY - startY

      onProgress(Math.max(0, deltaY) / thresholdPx)

      if (startedAtEdge && deltaY >= thresholdPx) {
        isResolved = true

        onReveal({ x: event.clientX })
      } else if (deltaY <= -thresholdPx) {
        isResolved = true

        onDismiss()
      }
    }

    const onPointerEnd = (event) => {
      if (
        pointerId === null ||
        event.pointerId !== pointerId
      ) {
        return
      }

      reset()
    }

    domElement.addEventListener(
      "pointerdown",
      onPointerDown,
    )

    domElement.addEventListener(
      "pointermove",
      onPointerMove,
    )

    domElement.addEventListener("pointerup", onPointerEnd)

    domElement.addEventListener(
      "pointercancel",
      onPointerEnd,
    )

    return () => {
      domElement.removeEventListener(
        "pointerdown",
        onPointerDown,
      )

      domElement.removeEventListener(
        "pointermove",
        onPointerMove,
      )

      domElement.removeEventListener(
        "pointerup",
        onPointerEnd,
      )

      domElement.removeEventListener(
        "pointercancel",
        onPointerEnd,
      )
    }
  }, [domElementRef])
}

export default useEdgeSwipe
