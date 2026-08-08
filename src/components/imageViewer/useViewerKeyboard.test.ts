import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { UseViewerKeyboardOptions } from "./useViewerKeyboard"
import useViewerKeyboard from "./useViewerKeyboard"

const pressKey = (code: string) => {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { code }),
  )
}

const setup = (
  overrides: Partial<UseViewerKeyboardOptions> = {},
) => {
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

  it("exits fullscreen on Escape without closing the viewer", () => {
    const onExitFullScreen = vi.fn()
    const { onClose } = setup({
      isFullScreen: true,
      onExitFullScreen,
    })

    pressKey("Escape")

    expect(onExitFullScreen).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes the viewer on Escape once fullscreen is already off", () => {
    const onExitFullScreen = vi.fn()
    const { onClose } = setup({
      isFullScreen: false,
      onExitFullScreen,
    })

    pressKey("Escape")

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onExitFullScreen).not.toHaveBeenCalled()
  })

  it("still leaves the viewer on Enter/Backspace while fullscreen", () => {
    // Only Escape is the layered dismiss key; Enter/Backspace keep their
    // "leave the viewer" meaning even when the window is fullscreen.
    const onExitFullScreen = vi.fn()
    const { onClose } = setup({
      isFullScreen: true,
      onExitFullScreen,
    })

    pressKey("Enter")
    pressKey("Backspace")

    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onExitFullScreen).not.toHaveBeenCalled()
  })
})
