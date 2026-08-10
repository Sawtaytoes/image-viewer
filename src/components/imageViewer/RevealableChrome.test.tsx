import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, test, vi } from "vitest"

import FullScreenContext from "../convenience/FullScreenContext"
import FileSystemContext, {
  type FileSystemContextValue,
} from "../fileBrowser/FileSystemContext"
import WorkspaceContext, {
  defaultWorkspaceContextValue,
} from "../workspace/WorkspaceContext"
import WorkspaceProvider from "../workspace/WorkspaceProvider"
import ImageViewerContext from "./ImageViewerContext"
import ImageViewerProvider from "./ImageViewerProvider"
import RevealableChrome from "./RevealableChrome"

// A legacy single-image scene (`imageFilePath` set, no panes) with spies on the
// column actions, so a click on "Add column" can be asserted to promote the
// image before adding the next column.
const LEGACY_IMAGE_FILES = [
  { name: "a.bmp", path: "/Landscapes/a.bmp" },
  { name: "b.bmp", path: "/Landscapes/b.bmp" },
]

const renderLegacyChrome = (
  workspaceOverrides: Partial<
    typeof defaultWorkspaceContextValue
  > = {},
) => {
  const addPane = vi.fn(() => ({
    currentIndex: 0,
    folderId: null,
    id: "pane-1",
  }))
  const addPaneAndFill = vi.fn()
  const assignFolderPathToPane = vi.fn()
  const leaveImageViewer = vi.fn()

  const fileSystemValue: FileSystemContextValue = {
    directories: [],
    filePath: "/Landscapes",
    imageFiles: LEGACY_IMAGE_FILES,
    isLoading: false,
    isRootFilePath: false,
    navigateUpFolderTree: vi.fn(),
    setFilePath: vi.fn(),
  }

  render(
    <FileSystemContext.Provider value={fileSystemValue}>
      <WorkspaceContext.Provider
        value={{
          ...defaultWorkspaceContextValue,
          addPane,
          addPaneAndFill,
          assignFolderPathToPane,
          panes: [],
          ...workspaceOverrides,
        }}
      >
        <ImageViewerContext.Provider
          value={{
            imageFileName: "b.bmp",
            imageFilePath: "/Landscapes/b.bmp",
            leaveImageViewer,
            setImageFile: vi.fn(),
          }}
        >
          <FullScreenContext.Provider
            value={{
              isFullScreen: false,
              toggleFullScreen: vi.fn(),
            }}
          >
            <RevealableChrome
              isVisible
              setIsVisible={vi.fn()}
              spawn={vi.fn()}
              viewerRef={createRef<HTMLDivElement>()}
            />
          </FullScreenContext.Provider>
        </ImageViewerContext.Provider>
      </WorkspaceContext.Provider>
    </FileSystemContext.Provider>,
  )

  return {
    addPane,
    addPaneAndFill,
    assignFolderPathToPane,
    leaveImageViewer,
  }
}

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
  test("anchors to the very top of the screen in fullscreen so its hitbox matches where it draws", () => {
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

  test("sits below the custom title bar when windowed", () => {
    renderChrome({ isFullScreen: false })

    expect(getChromeBar().className).toContain(
      "top-(--title-bar-height)",
    )
  })

  test("promotes the legacy single image into its own column before adding one, so it isn't dropped", () => {
    const {
      addPane,
      addPaneAndFill,
      assignFolderPathToPane,
      leaveImageViewer,
    } = renderLegacyChrome()

    fireEvent.click(
      screen.getByRole("button", { name: "Add column" }),
    )

    // The viewed image becomes column 1: its folder, positioned on that exact
    // image (index 1 of the two-image listing).
    expect(addPane).toHaveBeenCalledTimes(1)
    expect(assignFolderPathToPane).toHaveBeenCalledWith(
      "pane-1",
      { name: "Landscapes", path: "/Landscapes" },
      1,
    )
    expect(leaveImageViewer).toHaveBeenCalledTimes(1)
    // ...then the requested new column is added.
    expect(addPaneAndFill).toHaveBeenCalledTimes(1)
  })

  test("adds a plain column (no promotion) once columns already exist", () => {
    const {
      addPane,
      addPaneAndFill,
      assignFolderPathToPane,
      leaveImageViewer,
    } = renderLegacyChrome({
      panes: [
        { currentIndex: 0, folderId: null, id: "existing" },
      ],
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Add column" }),
    )

    expect(addPane).not.toHaveBeenCalled()
    expect(assignFolderPathToPane).not.toHaveBeenCalled()
    expect(leaveImageViewer).not.toHaveBeenCalled()
    expect(addPaneAndFill).toHaveBeenCalledTimes(1)
  })

  test("carries a fullscreen-exit control only in fullscreen (the title bar owns it windowed)", () => {
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
