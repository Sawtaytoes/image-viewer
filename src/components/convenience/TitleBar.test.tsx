import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import ImageViewerContext, {
  type ImageViewerContextValue,
} from "../imageViewer/ImageViewerContext"
import WorkspaceContext, {
  defaultWorkspaceContextValue,
  type WorkspaceContextValue,
} from "../workspace/WorkspaceContext"
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
  test("stands the bar down in fullscreen while the viewer is open, so only the viewer chrome is the one summonable bar", () => {
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

  test("stays slid up in fullscreen while the viewer is open, no matter what pointer events arrive", () => {
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

  test("pins the bar open in the fullscreen file browser and mounts no reveal strip, so it never covers the directory controls", () => {
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

  test("keeps the bar pinned open when windowed regardless of the viewer", () => {
    renderTitleBar({
      imageFilePath: "C:\\pics\\photo.jpg",
      isFullScreen: false,
    })

    expect(getBar().style.transform).toBe("translateY(0)")
  })
})

// The queue actions read straight off `WorkspaceContext`, so an explicit
// provider (spreading the real default) drives them directly — no async
// `WorkspaceProvider` hydration off `window.api.queue.hasSaved()` to await, and
// `clearSavedQueue` is a spy rather than a real disk write. Same pattern as
// `RevealableChrome.test`.
const renderTitleBarWithWorkspace = (
  workspaceOverrides: Partial<WorkspaceContextValue>,
) =>
  render(
    <WorkspaceContext.Provider
      value={{
        ...defaultWorkspaceContextValue,
        ...workspaceOverrides,
      }}
    >
      <ImageViewerContext.Provider
        value={{
          imageFileName: undefined,
          imageFilePath: undefined,
          leaveImageViewer: vi.fn(),
          setImageFile: vi.fn(),
        }}
      >
        <FullScreenContext.Provider
          value={{
            isFullScreen: false,
            toggleFullScreen: vi.fn(),
          }}
        >
          <TitleBar />
        </FullScreenContext.Provider>
      </ImageViewerContext.Provider>
    </WorkspaceContext.Provider>,
  )

describe("TitleBar 'Delete saved'", () => {
  test("shows the button when a saved queue exists and clears the saved slot on click", () => {
    const clearSavedQueue = vi.fn()

    renderTitleBarWithWorkspace({
      clearSavedQueue,
      hasSavedQueue: true,
    })

    const deleteSaved = screen.getByRole("button", {
      name: "Delete saved",
    })

    fireEvent.click(deleteSaved)

    expect(clearSavedQueue).toHaveBeenCalledTimes(1)
  })

  test("hides the button when there is no saved queue", () => {
    renderTitleBarWithWorkspace({ hasSavedQueue: false })

    expect(
      screen.queryByRole("button", {
        name: "Delete saved",
      }),
    ).not.toBeInTheDocument()
  })
})
