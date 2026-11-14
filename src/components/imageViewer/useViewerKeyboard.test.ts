import { renderHook } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"

import DeleteItemsContext from "../deleting/DeleteItemsContext"
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

// Enter pressed while focus is on `element`: the event starts there and
// bubbles to the window, as a real key press does. Returns whether a listener
// cancelled it, which is what stops a focused button from clicking itself.
const pressEnterOn = (element: Element) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    code: "Enter",
  })

  element.dispatchEvent(event)

  return event.defaultPrevented
}

describe("useViewerKeyboard", () => {
  test("Enter on a focused tap surface is left to the surface", () => {
    const { onClose } = setup()
    const surface = document.createElement("button")

    surface.setAttribute("data-tap-surface", "")
    document.body.append(surface)

    expect(pressEnterOn(surface)).toBe(false)
    expect(onClose).not.toHaveBeenCalled()

    surface.remove()
  })

  test("Enter on any other button leaves the viewer and lets that button click, as before", () => {
    const { onClose } = setup()
    const button = document.createElement("button")

    document.body.append(button)

    expect(pressEnterOn(button)).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)

    button.remove()
  })

  test("fires onDelete when [Delete] is pressed while enabled", () => {
    const { onDelete } = setup()

    pressKey("Delete")

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  test("ignores keys (including Delete) while disabled", () => {
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

  test("stands down while the delete dialog is up, so its keys never leave the viewer", () => {
    const handlers = {
      goToNextImage: vi.fn(),
      goToPreviousImage: vi.fn(),
      isEnabled: true,
      onClose: vi.fn(),
    }

    renderHook(() => useViewerKeyboard(handlers), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(
          DeleteItemsContext.Provider,
          {
            value: {
              isDeleteDialogVisible: true,
              requestDelete: () => Promise.resolve(null),
            },
          },
          children,
        ),
    })

    pressKey("Enter")
    pressKey("Backspace")
    pressKey("Escape")

    expect(handlers.onClose).not.toHaveBeenCalled()
  })

  test("treats [Delete] as a no-op when no onDelete is supplied", () => {
    // No assertion target — the point is that dispatching doesn't throw when
    // the optional handler is absent (a view that doesn't support delete).
    setup({ onDelete: undefined })

    expect(() => {
      pressKey("Delete")
    }).not.toThrow()
  })

  test("still wires the existing nav/close keys", () => {
    const { goToNextImage, goToPreviousImage, onClose } =
      setup()

    pressKey("ArrowRight")
    pressKey("ArrowLeft")
    pressKey("Escape")

    expect(goToNextImage).toHaveBeenCalledTimes(1)
    expect(goToPreviousImage).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("exits fullscreen on Escape without closing the viewer", () => {
    const onExitFullScreen = vi.fn()
    const { onClose } = setup({
      isFullScreen: true,
      onExitFullScreen,
    })

    pressKey("Escape")

    expect(onExitFullScreen).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  test("closes the viewer on Escape once fullscreen is already off", () => {
    const onExitFullScreen = vi.fn()
    const { onClose } = setup({
      isFullScreen: false,
      onExitFullScreen,
    })

    pressKey("Escape")

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onExitFullScreen).not.toHaveBeenCalled()
  })

  test("still leaves the viewer on Enter/Backspace while fullscreen", () => {
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
