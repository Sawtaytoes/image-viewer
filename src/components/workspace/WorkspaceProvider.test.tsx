import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { useContext } from "react"
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import WorkspaceContext from "./WorkspaceContext"
import WorkspaceProvider from "./WorkspaceProvider"

interface WrapperProps {
  children: ReactNode
}

const renderWorkspace = () => {
  const wrapper = ({ children }: WrapperProps) => (
    <WorkspaceProvider>{children}</WorkspaceProvider>
  )

  return renderHook(() => useContext(WorkspaceContext), {
    wrapper,
  })
}

describe("WorkspaceProvider", () => {
  test("starts with no panes", () => {
    const { result } = renderWorkspace()

    expect(result.current.panes).toHaveLength(0)
    expect(result.current.activePaneId).toBe(null)
  })

  test("dedupes addFoldersToQueue by path", () => {
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

  test("nulls every pane that referenced a removed folder", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
      ])
    })

    const folderId = result.current.queuedFolders[0].id

    let firstPaneId = ""
    let secondPaneId = ""

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

  test("clearQueue empties the queue and severs every referencing pane", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
        { name: "b", path: "/b" },
      ])
    })

    const [firstFolder] = result.current.queuedFolders

    let paneId = ""

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

  test("resets currentIndex to 0 when assigning a folder to a pane", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
        { name: "b", path: "/b" },
      ])
    })

    let paneId = ""

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
      )?.currentIndex,
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

    expect(pane?.folderId).toBe(secondFolder.id)
    expect(pane?.currentIndex).toBe(0)
  })

  test("clearPanes drops every pane back to the gallery", () => {
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

  test("assignFolderPathToPane queues a new folder and fills the named pane", () => {
    const { result } = renderWorkspace()

    let firstPaneId = ""
    let secondPaneId = ""

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
    expect(secondPane?.folderId).toBe(folder?.id)
    expect(secondPane?.currentIndex).toBe(0)
    expect(result.current.activePaneId).toBe(secondPaneId)
    // The other pane is untouched.
    expect(firstPane?.folderId).toBe(null)
  })

  test("assignFolderPathToPane reuses an already-queued folder instead of duplicating it", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "Cats", path: "/cats" },
      ])
    })

    const existingFolderId =
      result.current.queuedFolders[0].id

    let paneId = ""

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
      )?.folderId,
    ).toBe(existingFolderId)
  })

  test("assignFolderPathToPane opens at a given image index when provided", () => {
    const { result } = renderWorkspace()

    let paneId = ""

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

    expect(pane?.currentIndex).toBe(4)
  })

  test("auto-loads the next not-already-open queued folder into an emptied pane", () => {
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

    let firstPaneId = ""
    let secondPaneId = ""

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

    expect(firstPane?.folderId).toBe(folderC.id)
    expect(firstPane?.currentIndex).toBe(0)
  })

  test("leaves an emptied pane empty when no other queued folder is free", () => {
    const { result } = renderWorkspace()

    act(() => {
      result.current.addFoldersToQueue([
        { name: "a", path: "/a" },
      ])
    })

    const [folderA] = result.current.queuedFolders

    let paneId = ""

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
      )?.folderId,
    ).toBe(null)
  })

  describe("position memory", () => {
    afterEach(() => {
      window.api.setFolderLastIndex = () => {}

      window.api.getFolderLastIndex = () =>
        Promise.resolve(null)
    })

    test("records a folder-backed pane's new index by path", () => {
      const setFolderLastIndex = vi.fn()

      window.api.setFolderLastIndex = setFolderLastIndex

      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
        ])
      })

      const [folderA] = result.current.queuedFolders

      let paneId = ""

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

    test("does not record an index for a pane with no folder", () => {
      const setFolderLastIndex = vi.fn()

      window.api.setFolderLastIndex = setFolderLastIndex

      const { result } = renderWorkspace()

      let paneId = ""

      act(() => {
        paneId = result.current.addPane().id
      })

      act(() => {
        result.current.setPaneIndex(paneId, 2)
      })

      expect(setFolderLastIndex).not.toHaveBeenCalled()
    })

    test("resumes a pane to the folder's stored index on assign", async () => {
      window.api.getFolderLastIndex = vi.fn(() =>
        Promise.resolve(6),
      )

      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
        ])
      })

      const [folderA] = result.current.queuedFolders

      let paneId = ""

      act(() => {
        paneId = result.current.addPane().id
      })

      await act(async () => {
        result.current.assignFolderToPane(
          paneId,
          folderA.id,
        )

        // Let the async resume (getFolderLastIndex → setPaneIndex) settle.
        await Promise.resolve()
      })

      expect(
        window.api.getFolderLastIndex,
      ).toHaveBeenCalledWith("/a")

      expect(
        result.current.panes.find(
          (pane) => pane.id === paneId,
        )?.currentIndex,
      ).toBe(6)
    })
  })

  describe("addPaneAndFill", () => {
    test("opens a new column on the next not-already-open queued folder", () => {
      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
          { name: "b", path: "/b" },
        ])
      })

      const [folderA, folderB] =
        result.current.queuedFolders

      // First new column takes A; a second takes B (A is open elsewhere).
      act(() => {
        result.current.addPaneAndFill()
      })

      expect(result.current.panes.at(-1)?.folderId).toBe(
        folderA.id,
      )

      act(() => {
        result.current.addPaneAndFill()
      })

      expect(result.current.panes.at(-1)?.folderId).toBe(
        folderB.id,
      )
    })

    test("leaves the new column empty when the queue is exhausted", () => {
      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
        ])
      })

      act(() => {
        result.current.addPaneAndFill()
        result.current.addPaneAndFill()
      })

      // Two columns, one folder: the second falls back to an empty pane.
      expect(result.current.panes).toHaveLength(2)
      expect(
        result.current.panes.filter(
          (pane) => pane.folderId == null,
        ),
      ).toHaveLength(1)
    })
  })

  describe("deleteFolder", () => {
    afterEach(() => {
      window.api.deleteFilePath = () =>
        Promise.resolve(true)
    })

    test("trashes the folder, then dequeues it and severs its panes", async () => {
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

      let paneId = ""

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
        )?.folderId,
      ).toBe(null)
    })

    test("leaves the queue untouched when the trash op fails", async () => {
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

  describe("saved queue", () => {
    const originalQueue = window.api.queue
    const originalGetFolderLastIndex =
      window.api.getFolderLastIndex

    afterEach(() => {
      window.api.queue = originalQueue
      window.api.getFolderLastIndex =
        originalGetFolderLastIndex
    })

    test("saves this window's columns and every queued folder's last image", async () => {
      const save = vi.fn<Window["api"]["queue"]["save"]>(
        () => Promise.resolve(true),
      )

      window.api.queue = { ...originalQueue, save }

      // The shared store remembers /b at 9 and /a at 1; /a's column is on 4 now.
      window.api.getFolderLastIndex = (folderPath) =>
        Promise.resolve(
          folderPath === "/b"
            ? 9
            : folderPath === "/a"
              ? 1
              : null,
        )

      const { result } = renderWorkspace()

      act(() => {
        result.current.addFoldersToQueue([
          { name: "a", path: "/a" },
          { name: "b", path: "/b" },
          { name: "c", path: "/c" },
        ])
      })

      const [folderA] = result.current.queuedFolders

      let firstPaneId = ""

      act(() => {
        firstPaneId = result.current.addPane().id
      })

      act(() => {
        result.current.addPane()
      })

      act(() => {
        result.current.assignFolderToPane(
          firstPaneId,
          folderA.id,
        )
        result.current.setPaneIndex(firstPaneId, 4)
        result.current.setActivePaneId(firstPaneId)
      })

      await act(async () => {
        await result.current.saveQueue()
      })

      const [layout] = save.mock.calls[0]

      expect(layout.lastIndexByPath).toEqual({
        "/a": 4,
        "/b": 9,
      })
      expect(layout.activePaneIndex).toBe(0)
      expect(layout.panes[0]).toEqual({
        currentIndex: 4,
        folderPath: "/a",
      })
      expect(layout.panes).toHaveLength(2)
    })

    test("loading brings back the saved columns on their folders and images", async () => {
      const folders = [
        { id: "saved-a", name: "a", path: "/a" },
        { id: "saved-b", name: "b", path: "/b" },
      ]

      window.api.queue = {
        ...originalQueue,
        load: () =>
          Promise.resolve({
            activePaneIndex: 1,
            folders,
            lastIndexByPath: { "/a": 7, "/b": 12 },
            panes: [
              { currentIndex: 7, folderPath: "/a" },
              { currentIndex: 12, folderPath: "/b" },
              { currentIndex: 3, folderPath: "/gone" },
            ],
          }),
      }

      const { result } = renderWorkspace()

      await act(async () => {
        result.current.loadQueue()

        await Promise.resolve()
      })

      expect(result.current.queuedFolders).toEqual(folders)

      const [paneA, paneB, paneGone] = result.current.panes

      expect(paneA).toMatchObject({
        currentIndex: 7,
        folderId: "saved-a",
      })
      expect(paneB).toMatchObject({
        currentIndex: 12,
        folderId: "saved-b",
      })
      expect(result.current.activePaneId).toBe(paneB.id)

      // A column whose folder left the queue keeps its place in the layout.
      expect(paneGone?.currentIndex).toBe(0)
    })

    test("loading a slot with no columns leaves this window's columns alone", async () => {
      window.api.queue = {
        ...originalQueue,
        load: () =>
          Promise.resolve({
            activePaneIndex: null,
            folders: [],
            lastIndexByPath: {},
            panes: [],
          }),
      }

      const { result } = renderWorkspace()

      act(() => {
        result.current.addPane()
      })

      await act(async () => {
        result.current.loadQueue()

        await Promise.resolve()
      })

      expect(result.current.panes).toHaveLength(1)
    })
  })
})
