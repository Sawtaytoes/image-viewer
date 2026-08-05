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

  it("stays slid up in fullscreen while the viewer is open, no matter what pointer events arrive", () => {
    renderTitleBar({
      imageFilePath: "C:\\pics\\photo.jpg",
      isFullScreen: true,
    })

    // The old fullscreen summon gesture is gone: a downward drag from the top
    // edge must not bring the standing-down bar back — the viewer chrome is the
    // one summonable bar in this state.
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

  it("pins the bar open in the fullscreen file browser and mounts no reveal strip, so it never covers the directory controls", () => {
    const { container } = renderTitleBar({
      isFullScreen: true,
    })

    // No viewer open: the bar is pinned (not auto-hiding), so the fullscreen
    // browser insets its content below it rather than the bar overlaying the
    // directory controls (2026-08-05 decision — "pin the bar, push the content
    // down").
    expect(getBar().style.transform).toBe("translateY(0)")

    // Nothing is mounted to summon a hidden bar — there is no hidden state to
    // summon, and no covering strip that could swallow a tap on the directory
    // controls beneath the top edge.
    expect(
      container.querySelector(".pointer-events-none"),
    ).toBeNull()
  })

  it("keeps the bar pinned open when windowed regardless of the viewer", () => {
    renderTitleBar({
      imageFilePath: "C:\\pics\\photo.jpg",
      isFullScreen: false,
    })

    expect(getBar().style.transform).toBe("translateY(0)")
  })
})
