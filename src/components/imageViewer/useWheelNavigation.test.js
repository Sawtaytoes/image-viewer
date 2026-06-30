import { renderHook } from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import useWheelNavigation from "./useWheelNavigation"

// jsdom has WheelEvent, but its constructor ignores `deltaMode`; bolt it on so
// the line/page normalization is exercisable.
const createWheelEvent = ({
  deltaMode = 0,
  deltaX = 0,
  deltaY = 0,
} = {}) => {
  const event = new WheelEvent("wheel", {
    bubbles: true,
    deltaX,
    deltaY,
  })

  Object.defineProperty(event, "deltaMode", {
    value: deltaMode,
  })

  return event
}

describe("useWheelNavigation", () => {
  let domElement

  beforeEach(() => {
    domElement = document.createElement("div")

    document.body.appendChild(domElement)
  })

  afterEach(() => {
    domElement.remove()
  })

  const renderWheelNavigation = () => {
    const goToNextImage = vi.fn()
    const goToPreviousImage = vi.fn()
    const domElementRef = { current: domElement }

    renderHook(() =>
      useWheelNavigation({
        domElementRef,
        goToNextImage,
        goToPreviousImage,
      }),
    )

    return { goToNextImage, goToPreviousImage }
  }

  it("steps to the next image on a downward wheel notch", () => {
    const { goToNextImage, goToPreviousImage } =
      renderWheelNavigation()

    domElement.dispatchEvent(
      createWheelEvent({ deltaY: 100 }),
    )

    expect(goToNextImage).toHaveBeenCalledTimes(1)
    expect(goToPreviousImage).not.toHaveBeenCalled()
  })

  it("steps to the previous image on an upward wheel notch", () => {
    const { goToNextImage, goToPreviousImage } =
      renderWheelNavigation()

    domElement.dispatchEvent(
      createWheelEvent({ deltaY: -100 }),
    )

    expect(goToPreviousImage).toHaveBeenCalledTimes(1)
    expect(goToNextImage).not.toHaveBeenCalled()
  })

  it("accumulates small deltas and steps once past the threshold", () => {
    const { goToNextImage } = renderWheelNavigation()

    // Each below the 24px threshold; the third crosses it.
    domElement.dispatchEvent(
      createWheelEvent({ deltaY: 10 }),
    )
    domElement.dispatchEvent(
      createWheelEvent({ deltaY: 10 }),
    )

    expect(goToNextImage).not.toHaveBeenCalled()

    domElement.dispatchEvent(
      createWheelEvent({ deltaY: 10 }),
    )

    expect(goToNextImage).toHaveBeenCalledTimes(1)
  })

  it("steps only once for one large notch", () => {
    const { goToNextImage } = renderWheelNavigation()

    // A single notch is one intent regardless of its pixel magnitude — it must
    // not fling several images forward.
    domElement.dispatchEvent(
      createWheelEvent({ deltaY: 240 }),
    )

    expect(goToNextImage).toHaveBeenCalledTimes(1)
  })

  it("drops opposite-direction leftover on reversal", () => {
    const { goToNextImage, goToPreviousImage } =
      renderWheelNavigation()

    // Builds downward momentum below the threshold...
    domElement.dispatchEvent(
      createWheelEvent({ deltaY: 20 }),
    )

    // ...then a single upward notch should step back immediately, not first
    // burn off the 20px of downward leftover.
    domElement.dispatchEvent(
      createWheelEvent({ deltaY: -24 }),
    )

    expect(goToPreviousImage).toHaveBeenCalledTimes(1)
    expect(goToNextImage).not.toHaveBeenCalled()
  })

  it("scales line-mode deltas into the pixel budget", () => {
    const { goToNextImage } = renderWheelNavigation()

    // 2 lines * 16px = 32px ≥ threshold.
    domElement.dispatchEvent(
      createWheelEvent({ deltaMode: 1, deltaY: 2 }),
    )

    expect(goToNextImage).toHaveBeenCalledTimes(1)
  })

  it("ignores horizontal-dominant wheels", () => {
    const { goToNextImage, goToPreviousImage } =
      renderWheelNavigation()

    domElement.dispatchEvent(
      createWheelEvent({ deltaX: 100, deltaY: 10 }),
    )

    expect(goToNextImage).not.toHaveBeenCalled()
    expect(goToPreviousImage).not.toHaveBeenCalled()
  })
})
