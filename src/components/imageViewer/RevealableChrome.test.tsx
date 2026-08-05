import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import FullScreenContext from "../convenience/FullScreenContext"
import WorkspaceProvider from "../workspace/WorkspaceProvider"
import ImageViewerProvider from "./ImageViewerProvider"
import RevealableChrome from "./RevealableChrome"

const renderChrome = ({
  isFullScreen,
  toggleFullScreen = vi.fn(),
}: {
  isFullScreen: boolean
  toggleFullScreen?: () => void
}) => {
  const viewerRef = createRef<HTMLDivElement>()

  const result = render(
    <WorkspaceProvider>
      <ImageViewerProvider>
        <FullScreenContext.Provider
          value={{ isFullScreen, toggleFullScreen }}
        >
          <RevealableChrome
            isVisible
            setIsVisible={vi.fn()}
            spawn={vi.fn()}
            viewerRef={viewerRef}
          />
        </FullScreenContext.Provider>
      </ImageViewerProvider>
    </WorkspaceProvider>,
  )

  return result
}

// The chrome bar div is the parent of the "Folders" back button.
const getChromeBar = () =>
  screen.getByRole("button", { name: /folders/i })
    .parentElement as HTMLElement

describe("RevealableChrome", () => {
  it("anchors to the very top of the screen in fullscreen so its hitbox matches where it draws", () => {
    renderChrome({ isFullScreen: true })

    const bar = getChromeBar()

    // Full-bleed viewer starts at `top-0`; the bar (and its hit strip) must too,
    // or the controls draw ~40px below where they can be tapped — the "click
    // them in a weird spot" offset.
    expect(bar.className).toContain("top-0")
    expect(bar.className).not.toContain(
      "top-(--title-bar-height)",
    )
  })

  it("sits below the custom title bar when windowed", () => {
    renderChrome({ isFullScreen: false })

    expect(getChromeBar().className).toContain(
      "top-(--title-bar-height)",
    )
  })

  it("carries a fullscreen-exit control only in fullscreen (the title bar owns it windowed)", () => {
    const toggleFullScreen = vi.fn()

    const { rerender } = renderChrome({
      isFullScreen: true,
      toggleFullScreen,
    })

    const exitButton = screen.getByRole("button", {
      name: /exit fullscreen/i,
    })

    fireEvent.click(exitButton)

    expect(toggleFullScreen).toHaveBeenCalledTimes(1)

    // Windowed, the title bar's own control is reachable, so the chrome must not
    // duplicate it.
    rerender(
      <WorkspaceProvider>
        <ImageViewerProvider>
          <FullScreenContext.Provider
            value={{
              isFullScreen: false,
              toggleFullScreen,
            }}
          >
            <RevealableChrome
              isVisible
              setIsVisible={vi.fn()}
              spawn={vi.fn()}
              viewerRef={createRef<HTMLDivElement>()}
            />
          </FullScreenContext.Provider>
        </ImageViewerProvider>
      </WorkspaceProvider>,
    )

    expect(
      screen.queryByRole("button", {
        name: /exit fullscreen/i,
      }),
    ).toBeNull()
  })
})
