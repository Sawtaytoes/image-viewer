import { renderHook } from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import useLongPress from "./useLongPress"

// jsdom lacks PointerEvent, so synthesize one off MouseEvent (which carries
// clientX/clientY) and bolt on the pointerId the hook reads.
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

describe("useLongPress", () => {
  let domElement

  beforeEach(() => {
    vi.useFakeTimers()

    domElement = document.createElement("div")

    document.body.appendChild(domElement)
  })

  afterEach(() => {
    vi.useRealTimers()

    domElement.remove()
  })

  const renderLongPress = (options) => {
    const domElementRef = { current: domElement }

    return renderHook(() =>
      useLongPress({ domElementRef, ...options }),
    )
  }

  it("fires onComplete after the hold duration", () => {
    const onCancel = vi.fn()
    const onComplete = vi.fn()

    renderLongPress({ holdMs: 500, onCancel, onComplete })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown"),
    )

    expect(onComplete).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("cancels (no completion) when the pointer moves past the threshold", () => {
    const onCancel = vi.fn()
    const onComplete = vi.fn()

    renderLongPress({
      holdMs: 500,
      moveCancelPx: 10,
      onCancel,
      onComplete,
    })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown", {
        clientX: 0,
        clientY: 0,
      }),
    )

    domElement.dispatchEvent(
      createPointerEvent("pointermove", {
        clientX: 0,
        clientY: 40,
      }),
    )

    expect(onCancel).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(500)

    expect(onComplete).not.toHaveBeenCalled()
  })

  it("never emits a non-zero progress for a quick tap", () => {
    const onProgress = vi.fn()

    renderLongPress({
      holdMs: 500,
      progressDelayMs: 150,
      onProgress,
    })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown"),
    )

    // Released before the progress delay elapses — the fill ring must stay
    // hidden so it can't steal the trailing `click`.
    vi.advanceTimersByTime(100)

    domElement.dispatchEvent(
      createPointerEvent("pointerup"),
    )

    expect(
      onProgress.mock.calls.every(
        ([fraction]) => fraction === 0,
      ),
    ).toBe(true)
  })

  it("fires onCancel when the press is released early", () => {
    const onCancel = vi.fn()
    const onComplete = vi.fn()

    renderLongPress({ holdMs: 500, onCancel, onComplete })

    domElement.dispatchEvent(
      createPointerEvent("pointerdown"),
    )

    vi.advanceTimersByTime(200)

    domElement.dispatchEvent(
      createPointerEvent("pointerup"),
    )

    expect(onCancel).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(500)

    expect(onComplete).not.toHaveBeenCalled()
  })
})
