import type { RefObject } from "react"
import { useEffect, useRef } from "react"

const noop = () => {}

// Where the reveal gesture crossed the threshold, so the caller can drop its
// tap feedback under the finger.
export interface EdgeSwipePoint {
  x: number
}

export interface UseEdgeSwipeOptions {
  domElementRef: RefObject<HTMLElement | null>
  edgePx?: number
  edgeRatio?: number | null
  thresholdPx?: number
  onDismiss?: () => void
  onProgress?: (fraction: number) => void
  onReveal?: (point: EdgeSwipePoint) => void
}

// The options as the listeners see them: re-snapshotted every render (the
// listeners attach once) with every default already resolved.
interface EdgeSwipeOptionsSnapshot {
  edgePx: number
  edgeRatio: number | null
  onDismiss: () => void
  onProgress: (fraction: number) => void
  onReveal: (point: EdgeSwipePoint) => void
  thresholdPx: number
}

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
}: UseEdgeSwipeOptions) => {
  const options: EdgeSwipeOptionsSnapshot = {
    edgePx,
    edgeRatio,
    onDismiss,
    onProgress,
    onReveal,
    thresholdPx,
  }

  const optionsRef = useRef(options)

  optionsRef.current = options

  useEffect(() => {
    const domElement = domElementRef.current

    if (!domElement) {
      return undefined
    }

    let isResolved = false
    let pointerId: number | null = null
    let isStartedAtEdge = false
    let startY = 0

    const reset = () => {
      isResolved = false
      pointerId = null
      isStartedAtEdge = false
    }

    const onPointerDown = (event: PointerEvent) => {
      if (pointerId !== null) {
        return
      }

      // A drag starting inside a pane's gallery/menu belongs to that overlay,
      // not to the chrome reveal — leave it disarmed so the overlay keeps its
      // own gestures. (`target` is only an `Element` for events over real
      // markup, which is exactly when `closest` means anything.)
      const { target } = event

      if (
        target instanceof Element &&
        target.closest("[data-viewer-overlay]")
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
      isStartedAtEdge = event.clientY <= edge
      isResolved = false
    }

    const onPointerMove = (event: PointerEvent) => {
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

      if (isStartedAtEdge && deltaY >= thresholdPx) {
        isResolved = true

        onReveal({ x: event.clientX })
      } else if (deltaY <= -thresholdPx) {
        isResolved = true

        onDismiss()
      }
    }

    const onPointerEnd = (event: PointerEvent) => {
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
