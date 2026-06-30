import { useEffect, useRef } from "react"

// Mouse-wheel ("middle mouse") image stepping: scrolling up/down drives
// prev/next just like the left/right nav zones and the arrow keys. Scroll down
// (delta toward the user) advances, scroll up goes back.
//
// At most one step per wheel event, gated by an accumulation threshold, so the
// gesture maps to one image at a time across hardware: a discrete wheel notch
// (one big delta, ~100px in Chromium) steps exactly once, while a
// high-resolution wheel or trackpad (a stream of small deltas) advances only
// once it has scrolled a deliberate amount — never flinging through the folder.
const WHEEL_STEP_THRESHOLD_PX = 24

// `deltaMode` 0 is pixels (the common case). Lines/pages report tiny integers,
// so scale them into the same pixel budget the threshold is tuned for.
const LINE_HEIGHT_PX = 16
const PAGE_HEIGHT_PX = 400

const normalizeDeltaY = (event) => {
  if (event.deltaMode === 1) {
    return event.deltaY * LINE_HEIGHT_PX
  }

  if (event.deltaMode === 2) {
    return event.deltaY * PAGE_HEIGHT_PX
  }

  return event.deltaY
}

const useWheelNavigation = ({
  domElementRef,
  goToNextImage,
  goToPreviousImage,
}) => {
  const callbacksRef = useRef()

  callbacksRef.current = {
    goToNextImage,
    goToPreviousImage,
  }

  useEffect(() => {
    const domElement = domElementRef.current

    if (!domElement) {
      return undefined
    }

    let accumulatedDeltaY = 0

    const onWheel = (event) => {
      // Ignore horizontal-dominant wheels (tilt wheels, sideways trackpad
      // swipes) — only vertical motion navigates.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return
      }

      // A reversal shouldn't have to first repay the opposite direction's
      // leftover, so drop any accumulation pointing the other way.
      const delta = normalizeDeltaY(event)

      if (
        Math.sign(delta) !== Math.sign(accumulatedDeltaY)
      ) {
        accumulatedDeltaY = 0
      }

      accumulatedDeltaY += delta

      // One step per event at most: a discrete notch is a single intent, not
      // "advance by its pixel magnitude". Small-delta hardware keeps banking
      // until a step's worth has scrolled, then resets.
      if (
        Math.abs(accumulatedDeltaY) <
        WHEEL_STEP_THRESHOLD_PX
      ) {
        return
      }

      const { goToNextImage, goToPreviousImage } =
        callbacksRef.current

      if (accumulatedDeltaY > 0) {
        goToNextImage()
      } else {
        goToPreviousImage()
      }

      accumulatedDeltaY = 0
    }

    domElement.addEventListener("wheel", onWheel, {
      passive: true,
    })

    return () => {
      domElement.removeEventListener("wheel", onWheel)
    }
  }, [domElementRef])
}

export default useWheelNavigation
