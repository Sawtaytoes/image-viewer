import { useEffect, useRef } from "react"

const noop = () => {}

// Pointer hook (same `usePointerHover` idiom: callbacks in a ref, listeners on
// `domElementRef`, full teardown). A downward drag that *starts within the top
// edge region* reveals; an upward drag of similar magnitude dismisses. Touch
// gets implicit pointer capture, so the move keeps reporting after the finger
// leaves that region; `pointerout` is intentionally not an end event here.
//
// The edge region is either a fixed `edgePx` from the top or, when `edgeRatio`
// is given, that fraction of the viewport height (resolved at press time so it
// tracks window resizes). A gesture that begins inside an element marked
// `data-viewer-overlay` (a pane's gallery/menu) is ignored, so the broad
// drag-down surface never steals that overlay's own scrolling and taps.
const useEdgeSwipe = ({
  domElementRef,
  edgePx = 32,
  edgeRatio = null,
  thresholdPx = 60,
  onDismiss = noop,
  onProgress = noop,
  onReveal = noop,
}) => {
  const optionsRef = useRef()

  optionsRef.current = {
    edgePx,
    edgeRatio,
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

      // A drag starting inside a pane's gallery/menu belongs to that overlay,
      // not to the chrome reveal — leave it disarmed so the overlay keeps its
      // own gestures.
      if (
        event.target?.closest?.("[data-viewer-overlay]")
      ) {
        return
      }

      const { edgePx, edgeRatio } = optionsRef.current

      const edge =
        edgeRatio === null
          ? edgePx
          : window.innerHeight * edgeRatio

      pointerId = event.pointerId
      startY = event.clientY
      startedAtEdge = event.clientY <= edge
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
