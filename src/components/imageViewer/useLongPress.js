import { useEffect, useRef } from "react"

const noop = () => {}

// Pointer-driven hold detector (mirrors `usePointerHover`: callbacks live in a
// ref, listeners attach in a `useEffect` keyed on `domElementRef`, full
// teardown). A stationary press past `holdMs` completes; moving more than
// `moveCancelPx` cancels — that's what lets a vertical drag scroll the list
// instead of selecting.
//
// `progressDelayMs` debounces the *visible* progress: a quick tap (down/up
// faster than the delay) never emits a non-zero fraction, so the fill ring
// stays unmounted and can't steal the trailing `click`. Past the delay the
// fill spans the remaining window (`holdMs - progressDelayMs`) so it starts at
// 0 rather than jumping.
const useLongPress = ({
  domElementRef,
  holdMs = 500,
  moveCancelPx = 10,
  progressDelayMs = 150,
  onCancel = noop,
  onComplete = noop,
  onProgress = noop,
  onStart = noop,
}) => {
  const optionsRef = useRef()

  optionsRef.current = {
    holdMs,
    moveCancelPx,
    progressDelayMs,
    onCancel,
    onComplete,
    onProgress,
    onStart,
  }

  useEffect(() => {
    const domElement = domElementRef.current

    let animationFrameId = null
    let holdTimeoutId = null
    let progressDelayTimeoutId = null
    let isCompleted = false
    let pointerId = null
    let startX = 0
    let startY = 0

    const stopTracking = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)

        animationFrameId = null
      }

      if (holdTimeoutId !== null) {
        window.clearTimeout(holdTimeoutId)

        holdTimeoutId = null
      }

      if (progressDelayTimeoutId !== null) {
        window.clearTimeout(progressDelayTimeoutId)

        progressDelayTimeoutId = null
      }

      pointerId = null
    }

    const onPointerDown = (event) => {
      // Ignore extra fingers while one press is already being tracked.
      if (pointerId !== null) {
        return
      }

      const {
        holdMs,
        progressDelayMs,
        onComplete,
        onProgress,
        onStart,
      } = optionsRef.current

      isCompleted = false
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY

      onStart({ event })

      // The RAF timestamp drives progress (0→1) so no separate clock is
      // needed; `onComplete` rides the timeout so fake-timer tests stay
      // deterministic. Progress only starts after `progressDelayMs` so a quick
      // tap never paints the ring, and the fill spans the remaining window.
      const progressWindowMs = Math.max(
        1,
        holdMs - progressDelayMs,
      )

      let startTimestamp = null

      const tick = (timestamp) => {
        if (startTimestamp === null) {
          startTimestamp = timestamp
        }

        const fraction = Math.min(
          1,
          (timestamp - startTimestamp) / progressWindowMs,
        )

        onProgress(fraction)

        if (fraction < 1) {
          animationFrameId =
            window.requestAnimationFrame(tick)
        }
      }

      progressDelayTimeoutId = window.setTimeout(() => {
        progressDelayTimeoutId = null

        animationFrameId =
          window.requestAnimationFrame(tick)
      }, progressDelayMs)

      holdTimeoutId = window.setTimeout(() => {
        isCompleted = true

        stopTracking()

        onProgress(1)

        onComplete({ event })
      }, holdMs)
    }

    const onPointerMove = (event) => {
      if (
        pointerId === null ||
        event.pointerId !== pointerId
      ) {
        return
      }

      const { moveCancelPx, onCancel, onProgress } =
        optionsRef.current

      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY

      if (Math.hypot(deltaX, deltaY) > moveCancelPx) {
        stopTracking()

        onProgress(0)

        onCancel({ event })
      }
    }

    const onPointerEnd = (event) => {
      if (
        pointerId === null ||
        event.pointerId !== pointerId
      ) {
        return
      }

      const { onCancel, onProgress } = optionsRef.current

      stopTracking()

      if (!isCompleted) {
        onProgress(0)

        onCancel({ event })
      }
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

    domElement.addEventListener("pointerout", onPointerEnd)

    return () => {
      stopTracking()

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

      domElement.removeEventListener(
        "pointerout",
        onPointerEnd,
      )
    }
  }, [domElementRef])
}

export default useLongPress
