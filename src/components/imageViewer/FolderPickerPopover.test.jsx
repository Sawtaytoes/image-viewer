import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import WorkspaceContext from "../workspace/WorkspaceContext"
import FolderPickerPopover from "./FolderPickerPopover"

const PANE_ID = "pane-1"

const renderPopover = ({
  currentFolderId = null,
  queuedFolders = [],
} = {}) => {
  const actions = {
    assignFolderToPane: vi.fn(),
    removePane: vi.fn(),
    setActivePaneId: vi.fn(),
  }

  const onClose = vi.fn()
  const onOpenGallery = vi.fn()

  render(
    <WorkspaceContext.Provider
      value={{ ...actions, queuedFolders }}
    >
      <FolderPickerPopover
        currentFolderId={currentFolderId}
        onClose={onClose}
        onOpenGallery={onOpenGallery}
        paneId={PANE_ID}
      />
    </WorkspaceContext.Provider>,
  )

  return { actions, onClose, onOpenGallery }
}

describe("FolderPickerPopover (per-column menu)", () => {
  it("assigns a tapped queued folder to the pane and closes", () => {
    const { actions, onClose } = renderPopover({
      queuedFolders: [{ id: "folder-1", name: "Cats" }],
    })

    fireEvent.click(screen.getByText("Cats"))

    expect(actions.assignFolderToPane).toHaveBeenCalledWith(
      PANE_ID,
      "folder-1",
    )
    expect(actions.setActivePaneId).toHaveBeenCalledWith(
      PANE_ID,
    )
    expect(onClose).toHaveBeenCalled()
  })

  it("opens the gallery view for this column", () => {
    const { onOpenGallery } = renderPopover()

    fireEvent.click(screen.getByText("Gallery view"))

    expect(onOpenGallery).toHaveBeenCalled()
  })

  it("closes the column from the menu", () => {
    const { actions } = renderPopover()

    fireEvent.click(screen.getByText("Close column"))

    expect(actions.removePane).toHaveBeenCalledWith(PANE_ID)
  })

  it("shows an empty-queue message but still offers the escape hatches", () => {
    renderPopover({ queuedFolders: [] })

    expect(
      screen.getByText("No folders queued yet."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Gallery view"),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Close column"),
    ).toBeInTheDocument()
  })

  it("closes on Escape", () => {
    const { onClose } = renderPopover()

    fireEvent.keyDown(document.body, { code: "Escape" })

    expect(onClose).toHaveBeenCalled()
  })
})
