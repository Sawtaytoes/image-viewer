import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import WorkspaceContext from "../workspace/WorkspaceContext"
import FolderPickerPopover from "./FolderPickerPopover"

const PANE_ID = "pane-1"

const renderPopover = ({
  currentFolderId = null,
  panes = [],
  queuedFolders = [],
} = {}) => {
  const actions = {
    assignFolderToPane: vi.fn(),
    deleteFolder: vi.fn(() => Promise.resolve(true)),
    removeFolder: vi.fn(),
    removePane: vi.fn(),
    setActivePaneId: vi.fn(),
  }

  const onClose = vi.fn()
  const onOpenGallery = vi.fn()

  render(
    <WorkspaceContext.Provider
      value={{ ...actions, panes, queuedFolders }}
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
  it("assigns a tapped queued folder to the pane and closes", async () => {
    const { actions, onClose } = renderPopover({
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    fireEvent.click(screen.getByText("Cats"))

    // Closing and activating happen synchronously; the assign waits on the
    // async "resume where I left off" lookup (null → start at 0 here).
    expect(actions.setActivePaneId).toHaveBeenCalledWith(
      PANE_ID,
    )
    expect(onClose).toHaveBeenCalled()

    await waitFor(() => {
      expect(
        actions.assignFolderToPane,
      ).toHaveBeenCalledWith(PANE_ID, "folder-1", 0)
    })
  })

  it("restores a queued folder to its stored index when picked from the modal", async () => {
    window.api.getFolderLastIndex = vi.fn(() =>
      Promise.resolve(7),
    )

    const { actions } = renderPopover({
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    fireEvent.click(screen.getByText("Cats"))

    await waitFor(() => {
      expect(
        actions.assignFolderToPane,
      ).toHaveBeenCalledWith(PANE_ID, "folder-1", 7)
    })

    expect(
      window.api.getFolderLastIndex,
    ).toHaveBeenCalledWith("/cats")

    window.api.getFolderLastIndex = () =>
      Promise.resolve(null)
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

  it("flags a queued folder that's open in another column", () => {
    renderPopover({
      currentFolderId: "folder-1",
      panes: [
        { folderId: "folder-1", id: PANE_ID },
        { folderId: "folder-2", id: "pane-2" },
      ],
      queuedFolders: [
        { id: "folder-1", name: "Cats" },
        { id: "folder-2", name: "Dogs" },
        { id: "folder-3", name: "Birds" },
      ],
    })

    // Open elsewhere → flagged. The current pane's folder and an unopened
    // folder are not.
    expect(
      screen.getByTitle(
        "Dogs — already open in another column",
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByTitle(
        "Cats — already open in another column",
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTitle(
        "Birds — already open in another column",
      ),
    ).not.toBeInTheDocument()
  })

  it("removes a queued folder from the queue via the ✕ (no confirm, no disk)", () => {
    const { actions } = renderPopover({
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    fireEvent.click(
      screen.getByLabelText("Remove Cats from queue"),
    )

    expect(actions.removeFolder).toHaveBeenCalledWith(
      "folder-1",
    )
    // The ✕ is queue-only — it never trashes the folder from disk.
    expect(actions.deleteFolder).not.toHaveBeenCalled()
  })

  it("deletes a queued folder from disk only after the confirm", () => {
    const { actions } = renderPopover({
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    // The trashcan arms the confirm; it doesn't delete on the first click.
    fireEvent.click(
      screen.getByLabelText("Delete Cats from disk"),
    )
    expect(actions.deleteFolder).not.toHaveBeenCalled()

    // Confirming ("Yes") trashes the folder.
    fireEvent.click(screen.getByText("Yes"))

    expect(actions.deleteFolder).toHaveBeenCalledWith(
      "folder-1",
    )
  })

  it("no longer offers a single-image delete action", () => {
    renderPopover({
      currentFolderId: "folder-1",
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    expect(
      screen.queryByText("Delete image"),
    ).not.toBeInTheDocument()
  })

  it("closes on Escape", () => {
    const { onClose } = renderPopover()

    fireEvent.keyDown(document.body, { code: "Escape" })

    expect(onClose).toHaveBeenCalled()
  })
})
