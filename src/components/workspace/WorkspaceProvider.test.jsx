import { act, renderHook } from "@testing-library/react"
import { useContext } from "react"
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import WorkspaceContext from "./WorkspaceContext"
import WorkspaceProvider from "./WorkspaceProvider"

const renderWorkspace = () => {
  const wrapper = ({ children }) => (
    <WorkspaceProvider>{children}</WorkspaceProvider>
  )

  return renderHook(() => useContext(WorkspaceContext), {
    wrapper,
  })
}

describe("WorkspaceProvider", () => {
  it("starts with no panes", () => {
    const { result } = renderWorkspace()

    expect(result.current.panes).toHaveLength(0)
    expect(result.current.activePaneId).toBe(null)
  })

  it("dedupes addFoldersToQueue by path", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
        { name: "b", path: "/b" },
        { name: "a-again", path: "/a" },
      ])
    })

    act(() => {
      result.current.addFoldersToQueue([
        { name: "b-again", path: "/b" },
        { name: "c", path: "/c" },
      ])
    })

    expect(
      result.current.queuedFolders.map(({ path }) => path),
    ).toEqual(["/a", "/b", "/c"])
  })

  it("nulls every pane that referenced a removed folder", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
      ])
    })

    const folderId = result.current.queuedFolders[0].id

    let firstPaneId
    let secondPaneId

    act(() => {
      firstPaneId = result.current.addPane().id
      secondPaneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderToPane(
        firstPaneId,
        folderId,
      )

      result.current.assignFolderToPane(
        secondPaneId,
        folderId,
      )
    })

    expect(result.current.panes).toHaveLength(2)

    expect(
      result.current.panes.every(
        (pane) => pane.folderId === folderId,
      ),
    ).toBe(true)

    act(() => {
      result.current.removeFolder(folderId)
    })

    expect(result.current.queuedFolders).toHaveLength(0)

    expect(
      result.current.panes.every(
        (pane) => pane.folderId === null,
      ),
    ).toBe(true)
  })

  it("clearQueue empties the queue and severs every referencing pane", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
        { name: "b", path: "/b" },
      ])
    })

    const [firstFolder] = result.current.queuedFolders

    let paneId

    act(() => {
      paneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderToPane(
        paneId,
        firstFolder.id,
      )
    })

    act(() => {
      result.current.clearQueue()
    })

    expect(result.current.queuedFolders).toHaveLength(0)

    // The pane stays (reverts to empty) rather than vanishing.
    expect(result.current.panes).toHaveLength(1)
    expect(result.current.panes[0].folderId).toBe(null)
  })

  it("resets currentIndex to 0 when assigning a folder to a pane", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
        { name: "b", path: "/b" },
      ])
    })

    let paneId

    act(() => {
      paneId = result.current.addPane().id
    })

    const [firstFolder, secondFolder] =
      result.current.queuedFolders

    act(() => {
      result.current.assignFolderToPane(
        paneId,
        firstFolder.id,
      )
    })

    act(() => {
      result.current.setPaneIndex(paneId, 5)
    })

    expect(
      result.current.panes.find(
        (pane) => pane.id === paneId,
      ).currentIndex,
    ).toBe(5)

    act(() => {
      result.current.assignFolderToPane(
        paneId,
        secondFolder.id,
      )
    })

    const pane = result.current.panes.find(
      (currentPane) => currentPane.id === paneId,
    )

    expect(pane.folderId).toBe(secondFolder.id)
    expect(pane.currentIndex).toBe(0)
  })

  it("clearPanes drops every pane back to the gallery", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addPane()
      result.current.addPane()
    })

    expect(result.current.panes).toHaveLength(2)

    act(() => {
      result.current.clearPanes()
    })

    expect(result.current.panes).toHaveLength(0)
    expect(result.current.activePaneId).toBe(null)
  })

  it("assignFolderPathToPane queues a new folder and fills the named pane", () => {
    const { result } = renderWorkspace()

    let firstPaneId
    let secondPaneId

    act(() => {
      firstPaneId = result.current.addPane().id
      secondPaneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderPathToPane(secondPaneId, {
        name: "Cats",
        path: "/cats",
      })
    })

    const folder = result.current.queuedFolders.find(
      (queuedFolder) => queuedFolder.path === "/cats",
    )

    const secondPane = result.current.panes.find(
      (pane) => pane.id === secondPaneId,
    )

    const firstPane = result.current.panes.find(
      (pane) => pane.id === firstPaneId,
    )

    // It fills the pane it was given, not a new one, and makes it active.
    expect(result.current.panes).toHaveLength(2)
    expect(result.current.queuedFolders).toHaveLength(1)
    expect(secondPane.folderId).toBe(folder.id)
    expect(secondPane.currentIndex).toBe(0)
    expect(result.current.activePaneId).toBe(secondPaneId)
    // The other pane is untouched.
    expect(firstPane.folderId).toBe(null)
  })

  it("assignFolderPathToPane reuses an already-queued folder instead of duplicating it", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "Cats", path: "/cats" },
      ])
    })

    const existingFolderId =
      result.current.queuedFolders[0].id

    let paneId

    act(() => {
      paneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderPathToPane(paneId, {
        name: "Cats",
        path: "/cats",
      })
    })

    expect(result.current.queuedFolders).toHaveLength(1)

    expect(
      result.current.panes.find(
        (pane) => pane.id === paneId,
      ).folderId,
    ).toBe(existingFolderId)
  })

  it("assignFolderPathToPane opens at a given image index when provided", () => {
    const { result } = renderWorkspace()

    let paneId

    act(() => {
      paneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderPathToPane(
        paneId,
        { name: "Cats", path: "/cats" },
        4,
      )
    })

    const pane = result.current.panes.find(
      (currentPane) => currentPane.id === paneId,
    )

    expect(pane.currentIndex).toBe(4)
  })

  it("auto-loads the next not-already-open queued folder into an emptied pane", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
        { name: "b", path: "/b" },
        { name: "c", path: "/c" },
      ])
    })

    const [folderA, folderB, folderC] =
      result.current.queuedFolders

    let firstPaneId
    let secondPaneId

    act(() => {
      firstPaneId = result.current.addPane().id
      secondPaneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderToPane(
        firstPaneId,
        folderA.id,
      )

      result.current.assignFolderToPane(
        secondPaneId,
        folderB.id,
      )
    })

    // Removing folder A empties the first pane; it should pick up C (the first
    // queued folder not already open) rather than B, which pane two holds.
    act(() => {
      result.current.removeFolder(folderA.id)
    })

    const firstPane = result.current.panes.find(
      (pane) => pane.id === firstPaneId,
    )

    expect(firstPane.folderId).toBe(folderC.id)
    expect(firstPane.currentIndex).toBe(0)
  })

  it("leaves an emptied pane empty when no other queued folder is free", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
      ])
    })

    const [folderA] = result.current.queuedFolders

    let paneId

    act(() => {
      paneId = result.current.addPane().id
    })

    act(() => {
      result.current.assignFolderToPane(paneId, folderA.id)
    })

    act(() => {
      result.current.removeFolder(folderA.id)
    })

    expect(
      result.current.panes.find(
        (pane) => pane.id === paneId,
      ).folderId,
    ).toBe(null)
  })

  describe("position memory", () => {
    afterEach(() => {
      window.api.setFolderLastIndex = () => {}
    })

    it("records a folder-backed pane's new index by path", () => {
      const setFolderLastIndex = vi.fn()

      window.api.setFolderLastIndex = setFolderLastIndex

      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
        ])
      })

      const [folderA] = result.current.queuedFolders

      let paneId

      act(() => {
        paneId = result.current.addPane().id
      })

      act(() => {
        result.current.assignFolderToPane(
          paneId,
          folderA.id,
        )
      })

      act(() => {
        result.current.setPaneIndex(paneId, 3)
      })

      expect(setFolderLastIndex).toHaveBeenCalledWith(
        "/a",
        3,
      )
    })

    it("does not record an index for a pane with no folder", () => {
      const setFolderLastIndex = vi.fn()

      window.api.setFolderLastIndex = setFolderLastIndex

      const { result } = renderWorkspace()

      let paneId

      act(() => {
        paneId = result.current.addPane().id
      })

      act(() => {
        result.current.setPaneIndex(paneId, 2)
      })

      expect(setFolderLastIndex).not.toHaveBeenCalled()
    })
  })

  describe("deleteFolder", () => {
    afterEach(() => {
      window.api.deleteFilePath = () =>
        Promise.resolve(true)
    })

    it("trashes the folder, then dequeues it and severs its panes", async () => {
      const deleteFilePath = vi.fn(() =>
        Promise.resolve(true),
      )

      window.api.deleteFilePath = deleteFilePath

      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
        ])
      })

      const [folderA] = result.current.queuedFolders

      let paneId

      act(() => {
        paneId = result.current.addPane().id
      })

      act(() => {
        result.current.assignFolderToPane(
          paneId,
          folderA.id,
        )
      })

      await act(async () => {
        await result.current.deleteFolder(folderA.id)
      })

      expect(deleteFilePath).toHaveBeenCalledWith({
        filePath: "/a",
        isDirectory: true,
      })
      expect(result.current.queuedFolders).toHaveLength(0)
      expect(
        result.current.panes.find(
          (pane) => pane.id === paneId,
        ).folderId,
      ).toBe(null)
    })

    it("leaves the queue untouched when the trash op fails", async () => {
      window.api.deleteFilePath = () =>
        Promise.resolve(false)

      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
        ])
      })

      const [folderA] = result.current.queuedFolders

      await act(async () => {
        await result.current.deleteFolder(folderA.id)
      })

      expect(result.current.queuedFolders).toHaveLength(1)
    })
  })
})
