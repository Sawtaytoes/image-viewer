import { act, renderHook } from "@testing-library/react"
import { useContext } from "react"
import { describe, expect, it } from "vitest"

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
})
