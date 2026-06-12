import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import useViewerKeyboard from "./useViewerKeyboard"

const pressKey = (code) => {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { code }),
  )
}

const setup = (overrides = {}) => {
  const handlers = {
    goToNextImage: vi.fn(),
    goToPreviousImage: vi.fn(),
    isEnabled: true,
    onClose: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }

  renderHook(() => useViewerKeyboard(handlers))

  return handlers
}

describe("useViewerKeyboard", () => {
  it("fires onDelete when [Delete] is pressed while enabled", () => {
    const { onDelete } = setup()

    pressKey("Delete")

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("ignores keys (including Delete) while disabled", () => {
    const { onClose, onDelete, goToNextImage } = setup({
      isEnabled: false,
    })

    pressKey("Delete")
    pressKey("Enter")
    pressKey("ArrowRight")

    expect(onDelete).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(goToNextImage).not.toHaveBeenCalled()
  })

  it("treats [Delete] as a no-op when no onDelete is supplied", () => {
    // No assertion target — the point is that dispatching doesn't throw when
    // the optional handler is absent (a view that doesn't support delete).
    setup({ onDelete: undefined })

    expect(() => {
      pressKey("Delete")
    }).not.toThrow()
  })

  it("still wires the existing nav/close keys", () => {
    const { goToNextImage, goToPreviousImage, onClose } =
      setup()

    pressKey("ArrowRight")
    pressKey("ArrowLeft")
    pressKey("Escape")

    expect(goToNextImage).toHaveBeenCalledTimes(1)
    expect(goToPreviousImage).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
