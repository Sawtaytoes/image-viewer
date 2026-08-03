import { act, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ImageViewerContext, {
  type ImageViewerContextValue,
} from "../imageViewer/ImageViewerContext"
import WorkspaceProvider from "../workspace/WorkspaceProvider"
import FullScreenContext from "./FullScreenContext"
import TitleBar from "./TitleBar"

// jsdom has no `PointerEvent`; the edge-swipe listeners only read `pointerId`,
// `clientY` and `pointerType`, so a `MouseEvent` with those grafted on is
// enough to drive the summon/dismiss gestures the title bar listens for on the
// document (same shape as `useEdgeSwipe.test.ts`).
const createPointerEvent = (
  type: string,
  {
    clientY = 0,
    pointerId = 1,
  }: { clientY?: number; pointerId?: number } = {},
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientY,
  })

  Object.defineProperty(event, "pointerId", {
    value: pointerId,
  })

  Object.defineProperty(event, "pointerType", {
    value: "touch",
  })

  return event
}

const renderTitleBar = ({
  imageFilePath,
  isFullScreen,
}: {
  imageFilePath?: string
  isFullScreen: boolean
}) => {
  const viewerValue: ImageViewerContextValue = {
    imageFileName: imageFilePath ? "photo.jpg" : undefined,
    imageFilePath,
    leaveImageViewer: vi.fn(),
    setImageFile: vi.fn(),
  }

  return render(
    <WorkspaceProvider>
      <ImageViewerContext.Provider value={viewerValue}>
        <FullScreenContext.Provider
          value={{
            isFullScreen,
            toggleFullScreen: vi.fn(),
          }}
        >
          <TitleBar />
        </FullScreenContext.Provider>
      </ImageViewerContext.Provider>
    </WorkspaceProvider>,
  )
}

// The bar div is the element carrying the inline slide transform; its first
// child is the app-name span.
const getBar = () =>
  screen.getByText("Image Viewer")
    .parentElement as HTMLElement

describe("TitleBar", () => {
  it("stands the bar down in fullscreen while the viewer is open, so only the viewer chrome is the one summonable bar", () => {
    const { container } = renderTitleBar({
      imageFilePath: "C:\\pics\\photo.jpg",
      isFullScreen: true,
    })

    // Put away (slid fully up), not flashed open, the instant fullscreen + a
    // viewer coincide — the second of the two stacked bars is gone.
    expect(getBar().style.transform).toBe(
      "translateY(-100%)",
    )

    // And no grab-handle strip is mounted to summon it.
    expect(
      container.querySelector(".pointer-events-none"),
    ).toBeNull()
  })

  it("ignores the summon swipe in fullscreen while the viewer is open", () => {
    renderTitleBar({
      imageFilePath: "C:\\pics\\photo.jpg",
      isFullScreen: true,
    })

    // A downward drag from the top edge — the gesture that reveals the bar when
    // it IS the active bar — must do nothing here.
    act(() => {
      document.documentElement.dispatchEvent(
        createPointerEvent("pointerdown", { clientY: 5 }),
      )

      document.documentElement.dispatchEvent(
        createPointerEvent("pointermove", { clientY: 400 }),
      )
    })

    expect(getBar().style.transform).toBe(
      "translateY(-100%)",
    )
  })

  it("summons a grab handle that cannot intercept taps once hidden in fullscreen", () => {
    const { container } = renderTitleBar({
      isFullScreen: true,
    })

    // Dismiss the initial flash with an upward swipe so the bar hides without
    // waiting out the auto-hide timer.
    act(() => {
      document.documentElement.dispatchEvent(
        createPointerEvent("pointerdown", { clientY: 300 }),
      )

      document.documentElement.dispatchEvent(
        createPointerEvent("pointermove", { clientY: 100 }),
      )
    })

    expect(getBar().style.transform).toBe(
      "translateY(-100%)",
    )

    // The only summon affordance left is the grab handle — and it is
    // `pointer-events-none`, so a tap on a directory control beneath the top
    // edge reaches the control instead of being swallowed (the regression
    // `2026-06-04-up-arrow-navigates-up-not-dropdown` locked out).
    const handleWrapper = container.querySelector(
      ".pointer-events-none",
    )

    expect(handleWrapper).not.toBeNull()
  })

  it("keeps the bar pinned open when windowed regardless of the viewer", () => {
    renderTitleBar({
      imageFilePath: "C:\\pics\\photo.jpg",
      isFullScreen: false,
    })

    expect(getBar().style.transform).toBe("translateY(0)")
  })
})
