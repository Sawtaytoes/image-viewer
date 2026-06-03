import { renderHook } from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import useEdgeSwipe from "./useEdgeSwipe"

const createPointerEvent = (
  type,
  { clientX = 0, clientY = 0, pointerId = 1 } = {},
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX,
    clientY,
  })

  Object.defineProperty(event, "pointerId", {
    value: pointerId,
  })

  return event
}

describe("useEdgeSwipe", () => {
  let domElement

  beforeEach(() => {
    domElement = document.createElement("div")

    document.body.appendChild(domElement)
  })

  afterEach(() => {
    domElement.remove()
  })

  const renderEdgeSwipe = (options) => {
    const domElementRef = { current: domElement }

    return renderHook(() =>
      useEdgeSwipe({ domElementRef, ...options }),
    )
  }

  it("reveals on a downward swipe that starts in the top edge", () => {
    const onReveal = vi.fn()

    renderEdgeSwipe({
      edgePx: 32,
      onReveal,
      thresholdPx: 60,
    })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown", {
        clientX: 50,
        clientY: 10,
      }),
    )

    domElement.dispatchEvent(
      createPointerEvent("pointermove", {
        clientX: 50,
        clientY: 80,
      }),
    )

    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it("does not reveal when the swipe starts below the edge", () => {
    const onReveal = vi.fn()

    renderEdgeSwipe({
      edgePx: 32,
      onReveal,
      thresholdPx: 60,
    })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown", {
        clientX: 50,
        clientY: 100,
      }),
    )

    domElement.dispatchEvent(
      createPointerEvent("pointermove", {
        clientX: 50,
        clientY: 200,
      }),
    )

    expect(onReveal).not.toHaveBeenCalled()
  })

  it("dismisses on an upward swipe past the threshold", () => {
    const onDismiss = vi.fn()

    renderEdgeSwipe({ onDismiss, thresholdPx: 60 })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown", {
        clientX: 50,
        clientY: 120,
      }),
    )

    domElement.dispatchEvent(
      createPointerEvent("pointermove", {
        clientX: 50,
        clientY: 40,
      }),
    )

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
