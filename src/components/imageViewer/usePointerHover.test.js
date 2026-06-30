import { renderHook } from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import usePointerHover from "./usePointerHover"

// jsdom lacks PointerEvent; synthesize one off MouseEvent and bolt on the
// pointerType the hover logic branches on.
const createPointerEvent = (
  type,
  { pointerType = "mouse" } = {},
) => {
  const event = new MouseEvent(type, { bubbles: true })

  Object.defineProperty(event, "pointerType", {
    value: pointerType,
  })

  return event
}

describe("usePointerHover", () => {
  let domElement

  beforeEach(() => {
    domElement = document.createElement("div")

    document.body.appendChild(domElement)
  })

  afterEach(() => {
    domElement.remove()
  })

  const renderPointerHover = () => {
    const callback = vi.fn()
    const domElementRef = { current: domElement }

    renderHook(() =>
      usePointerHover({ callback, domElementRef }),
    )

    return callback
  }

  const lastIsHovering = (callback) =>
    callback.mock.calls.at(-1)[0].isHovering

  it("reports hovering on pointer enter", () => {
    const callback = renderPointerHover()

    domElement.dispatchEvent(
      createPointerEvent("pointerenter"),
    )

    expect(lastIsHovering(callback)).toBe(true)
  })

  it("keeps hovering when a mouse releases over the element", () => {
    const callback = renderPointerHover()

    domElement.dispatchEvent(
      createPointerEvent("pointerenter"),
    )
    domElement.dispatchEvent(
      createPointerEvent("pointerup", {
        pointerType: "mouse",
      }),
    )

    expect(lastIsHovering(callback)).toBe(true)
  })

  it("clears hovering when a touch lifts (no pointerout fires)", () => {
    const callback = renderPointerHover()

    domElement.dispatchEvent(
      createPointerEvent("pointerenter"),
    )
    domElement.dispatchEvent(
      createPointerEvent("pointerup", {
        pointerType: "touch",
      }),
    )

    expect(lastIsHovering(callback)).toBe(false)
  })

  it("does not engage hover from pointer movement alone", () => {
    const callback = renderPointerHover()

    // An image opening under a stationary cursor must not light up the nav edge
    // sitting under it on the first stray move.
    domElement.dispatchEvent(
      createPointerEvent("pointermove", {
        pointerType: "mouse",
      }),
    )

    expect(callback).not.toHaveBeenCalled()
  })

  it("clears hovering on pointer cancel", () => {
    const callback = renderPointerHover()

    domElement.dispatchEvent(
      createPointerEvent("pointerenter"),
    )
    domElement.dispatchEvent(
      createPointerEvent("pointercancel", {
        pointerType: "touch",
      }),
    )

    expect(lastIsHovering(callback)).toBe(false)
  })

  it("clears hovering when the window loses focus (stuck-edge fix)", () => {
    const callback = renderPointerHover()

    domElement.dispatchEvent(
      createPointerEvent("pointerenter"),
    )

    // No pointerleave/out is delivered while the pointer sits over the edge and
    // the window blurs — the hover must clear anyway.
    window.dispatchEvent(new Event("blur"))

    expect(lastIsHovering(callback)).toBe(false)
  })
})
