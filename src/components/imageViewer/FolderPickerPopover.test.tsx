import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import type {
  DeleteJobResult,
  DeleteOutcome,
} from "../../deleting/deleteItems"
import type { QueuedFolder } from "../../types"
import DeleteItemsContext from "../deleting/DeleteItemsContext"
import type { Pane } from "../workspace/WorkspaceContext"
import WorkspaceContext, {
  defaultWorkspaceContextValue,
} from "../workspace/WorkspaceContext"
import FolderPickerPopover from "./FolderPickerPopover"

const PANE_ID = "pane-1"

interface RenderPopoverOptions {
  currentFolderId?: string | null
  deleteOutcome?: DeleteOutcome | null
  panes?: Pane[]
  queuedFolders?: QueuedFolder[]
}

// What the shared delete dialog resolves to: null for "No", or a result whose
// one item ended with `outcome`.
const createDeleteResult = (
  filePath: string,
  outcome: DeleteOutcome,
): DeleteJobResult => ({
  isStopped: outcome === "notDeleted",
  items: [
    {
      entriesRemoved: 0,
      entriesTotal: null,
      errorMessage: null,
      filePath,
      isDirectory: true,
      name: filePath,
      outcome,
      trashErrorMessage: null,
    },
  ],
})

const renderPopover = ({
  currentFolderId = null,
  deleteOutcome = "movedToTrash",
  panes = [],
  queuedFolders = [],
}: RenderPopoverOptions = {}) => {
  const requestDelete = vi.fn(
    (targets: readonly { filePath: string }[]) =>
      Promise.resolve(
        deleteOutcome === null
          ? null
          : createDeleteResult(
              targets[0]?.filePath ?? "",
              deleteOutcome,
            ),
      ),
  )

  const actions = {
    assignFolderToPane: vi.fn(),
    removeFolder: vi.fn(),
    removePane: vi.fn(),
    setActivePaneId: vi.fn(),
  }

  const onClose = vi.fn()
  const onOpenGallery = vi.fn()

  render(
    // Spread the real default rather than a bare literal: with the context
    // value fully typed, a partial object no longer typechecks — and the
    // members this menu doesn't touch have working no-op defaults.
    <DeleteItemsContext.Provider
      value={{
        isDeleteDialogVisible: false,
        requestDelete,
      }}
    >
      <WorkspaceContext.Provider
        value={{
          ...defaultWorkspaceContextValue,
          ...actions,
          panes,
          queuedFolders,
        }}
      >
        <FolderPickerPopover
          currentFolderId={currentFolderId}
          onClose={onClose}
          onOpenGallery={onOpenGallery}
          paneId={PANE_ID}
        />
      </WorkspaceContext.Provider>
    </DeleteItemsContext.Provider>,
  )

  return { actions, onClose, onOpenGallery, requestDelete }
}

describe("FolderPickerPopover (per-column menu)", () => {
  test("assigns a tapped queued folder to the pane and closes", () => {
    const { actions, onClose } = renderPopover({
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    fireEvent.click(screen.getByText("Cats"))

    // The provider's assignFolderToPane owns the resume-to-stored-index now, so
    // the modal just hands it the folder id and activates the pane.
    expect(actions.assignFolderToPane).toHaveBeenCalledWith(
      PANE_ID,
      "folder-1",
    )
    expect(actions.setActivePaneId).toHaveBeenCalledWith(
      PANE_ID,
    )
    expect(onClose).toHaveBeenCalled()
  })

  test("opens the gallery view for this column", () => {
    const { onOpenGallery } = renderPopover()

    fireEvent.click(screen.getByText("Gallery view"))

    expect(onOpenGallery).toHaveBeenCalled()
  })

  test("closes the column from the menu", () => {
    const { actions } = renderPopover()

    fireEvent.click(screen.getByText("Close column"))

    expect(actions.removePane).toHaveBeenCalledWith(PANE_ID)
  })

  test("shows an empty-queue message but still offers the escape hatches", () => {
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

  test("flags a queued folder that's open in another column", () => {
    renderPopover({
      currentFolderId: "folder-1",
      panes: [
        {
          currentIndex: 0,
          folderId: "folder-1",
          id: PANE_ID,
        },
        {
          currentIndex: 0,
          folderId: "folder-2",
          id: "pane-2",
        },
      ],
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
        { id: "folder-2", name: "Dogs", path: "/dogs" },
        { id: "folder-3", name: "Birds", path: "/birds" },
      ],
    })

    // Open elsewhere → flagged. The current pane's folder and an unopened
    // folder are not.
    //
    // The flag is a `Tooltip` rather than a native `title` now, so it is not in
    // the document until the row is hovered or focused — which makes this the
    // stronger test: `getByTitle` only ever proved an attribute was spelled
    // right, and could not have caught a tip that never opened. Focus is the
    // trigger driven here because it is the one a keyboard gets, and it needs no
    // fake timers (hover waits out `Tooltip`'s 200ms `restMs`).
    fireEvent.focus(screen.getByText("Dogs"))

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Dogs — already open in another column",
    )

    // The other two rows are checked by their own text rather than by
    // `queryByRole("tooltip")` returning nothing, because a synthetic `blur`
    // does not close the first tip: floating-ui's `useFocus` reads
    // `relatedTarget` to decide whether focus left the pair, and
    // `fireEvent.blur` supplies none — so the Dogs tip is still open here and
    // a bare role query would find it and blame the wrong row.
    fireEvent.focus(screen.getByText("Cats"))

    expect(
      screen.queryByText(
        "Cats — already open in another column",
      ),
    ).not.toBeInTheDocument()

    fireEvent.focus(screen.getByText("Birds"))

    expect(
      screen.queryByText(
        "Birds — already open in another column",
      ),
    ).not.toBeInTheDocument()
  })

  test("removes a queued folder from the queue via the ✕ (no confirm, no disk)", () => {
    const { actions, requestDelete } = renderPopover({
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
    expect(requestDelete).not.toHaveBeenCalled()
  })

  test("asks the shared delete dialog to delete the current column's folder, then dequeues it", async () => {
    const { actions, requestDelete } = renderPopover({
      currentFolderId: "folder-1",
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    // The menu only opens the dialog; the dialog asks before anything goes.
    fireEvent.click(screen.getByText("Delete folder"))

    expect(requestDelete).toHaveBeenCalledWith([
      { filePath: "/cats", isDirectory: true },
    ])

    await waitFor(() => {
      expect(actions.removeFolder).toHaveBeenCalledWith(
        "folder-1",
      )
    })
  })

  test.each<DeleteOutcome | null>([
    null,
    "notDeleted",
    "partlyDeleted",
    "failed",
  ])("keeps the folder queued when the delete ends as %s", async (deleteOutcome) => {
    const { actions, requestDelete } = renderPopover({
      currentFolderId: "folder-1",
      deleteOutcome,
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    fireEvent.click(screen.getByText("Delete folder"))

    await waitFor(() => {
      expect(requestDelete).toHaveBeenCalled()
    })

    // The folder is still on disk, so it must stay in the queue.
    await Promise.resolve()

    expect(actions.removeFolder).not.toHaveBeenCalled()
  })

  test("offers no folder-delete action when the column has no folder loaded", () => {
    renderPopover({
      currentFolderId: null,
      queuedFolders: [
        { id: "folder-1", name: "Cats", path: "/cats" },
      ],
    })

    // The delete acts on the current column's folder; with none loaded there's
    // nothing to delete, so the action is hidden (only the ✕ remove remains).
    expect(
      screen.queryByText("Delete folder"),
    ).not.toBeInTheDocument()
    expect(
      screen.getByLabelText("Remove Cats from queue"),
    ).toBeInTheDocument()
  })

  test("no longer offers a single-image delete action", () => {
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

  test("closes on Escape", () => {
    const { onClose } = renderPopover()

    fireEvent.keyDown(document.body, { code: "Escape" })

    expect(onClose).toHaveBeenCalled()
  })

  test("opens scrolled so the pane's own folder is centered in a long list", () => {
    // jsdom does no layout: give every element a fixed box, and each row an
    // offset from its index in the list.
    const rowHeight = 60
    const menuHeight = 600

    const offsetTopSpy = vi
      .spyOn(HTMLElement.prototype, "offsetTop", "get")
      .mockImplementation(function (this: HTMLElement) {
        const siblings = [
          ...(this.parentElement?.children ?? []),
        ]

        return siblings.indexOf(this) * rowHeight
      })
    const offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(rowHeight)
    const clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(menuHeight)

    const queuedFolders = Array.from(
      { length: 40 },
      (_, index) => ({
        id: `folder-${index}`,
        name: `Folder ${index}`,
        path: `/folder-${index}`,
      }),
    )

    renderPopover({
      currentFolderId: "folder-30",
      queuedFolders,
    })

    const menu = screen
      .getByText("Folder 30")
      .closest("[data-viewer-overlay] > div") as HTMLElement

    // Row 30 starts at 1800px; centering a 60px row in 600px puts it 270px down.
    expect(menu.scrollTop).toBe(30 * rowHeight - 270)

    offsetTopSpy.mockRestore()
    offsetHeightSpy.mockRestore()
    clientHeightSpy.mockRestore()
  })
})
