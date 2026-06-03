import PropTypes from "prop-types"
import { memo, useCallback, useMemo, useState } from "react"

import WorkspaceContext from "./WorkspaceContext"

// Renderer-safe id source. Avoids `Date.now()`/`Math.random()` so ids stay
// collision-free and the queue/panes remain serializable.
const createId = () => crypto.randomUUID()

const createPane = () => ({
  currentIndex: 0,
  folderId: null,
  id: createId(),
})

// Panes are ephemeral: there are none until the user opens a folder into a
// column, and closing the last one drops back to the gallery. The queue
// (queuedFolders / tabs) is the persistent thing.
const createInitialWorkspace = () => ({
  activePaneId: null,
  panes: [],
  queuedFolders: [],
})

const propTypes = {
  children: PropTypes.node.isRequired,
}

const WorkspaceProvider = ({ children }) => {
  const [workspace, setWorkspace] = useState(
    createInitialWorkspace,
  )

  // Identity only — no derived `imageFiles`. Dedupe by path so the same folder
  // can't queue twice.
  const addFolderToQueue = useCallback(({ name, path }) => {
    setWorkspace((previousWorkspace) => {
      const isAlreadyQueued =
        previousWorkspace.queuedFolders.some(
          (folder) => folder.path === path,
        )

      if (isAlreadyQueued) {
        return previousWorkspace
      }

      return {
        ...previousWorkspace,
        queuedFolders: [
          ...previousWorkspace.queuedFolders,
          { id: createId(), name, path },
        ],
      }
    })
  }, [])

  const addFoldersToQueue = useCallback((folders) => {
    setWorkspace((previousWorkspace) => {
      const queuedPaths = new Set(
        previousWorkspace.queuedFolders.map(
          (folder) => folder.path,
        ),
      )

      const newFolders = []

      folders.forEach(({ name, path }) => {
        if (queuedPaths.has(path)) {
          return
        }

        queuedPaths.add(path)

        newFolders.push({ id: createId(), name, path })
      })

      if (newFolders.length === 0) {
        return previousWorkspace
      }

      return {
        ...previousWorkspace,
        queuedFolders: [
          ...previousWorkspace.queuedFolders,
          ...newFolders,
        ],
      }
    })
  }, [])

  // Drop the folder and sever every pane that referenced it (panes don't
  // vanish — they revert to the empty `+` state). References are by id, so no
  // other pane is corrupted.
  const removeFolder = useCallback((folderId) => {
    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      panes: previousWorkspace.panes.map((pane) =>
        pane.folderId === folderId
          ? { ...pane, folderId: null }
          : pane,
      ),
      queuedFolders: previousWorkspace.queuedFolders.filter(
        (folder) => folder.id !== folderId,
      ),
    }))
  }, [])

  const addPane = useCallback(() => {
    const pane = createPane()

    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      panes: [...previousWorkspace.panes, pane],
    }))

    return pane
  }, [])

  const removePane = useCallback((paneId) => {
    setWorkspace((previousWorkspace) => {
      const panes = previousWorkspace.panes.filter(
        (pane) => pane.id !== paneId,
      )

      return {
        ...previousWorkspace,
        activePaneId:
          previousWorkspace.activePaneId === paneId
            ? (panes[0]?.id ?? null)
            : previousWorkspace.activePaneId,
        panes,
      }
    })
  }, [])

  // Assigning a folder resets the pane's scroll position to the first image.
  const assignFolderToPane = useCallback(
    (paneId, folderId) => {
      setWorkspace((previousWorkspace) => ({
        ...previousWorkspace,
        panes: previousWorkspace.panes.map((pane) =>
          pane.id === paneId
            ? { ...pane, currentIndex: 0, folderId }
            : pane,
        ),
      }))
    },
    [],
  )

  const setPaneIndex = useCallback((paneId, index) => {
    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      panes: previousWorkspace.panes.map((pane) =>
        pane.id === paneId
          ? { ...pane, currentIndex: index }
          : pane,
      ),
    }))
  }, [])

  const setActivePaneId = useCallback((paneId) => {
    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      activePaneId: paneId,
    }))
  }, [])

  // Drop all columns — leaves the immersive viewer back to the gallery.
  const clearPanes = useCallback(() => {
    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      activePaneId: null,
      panes: [],
    }))
  }, [])

  const workspaceProviderValue = useMemo(
    () => ({
      activePaneId: workspace.activePaneId,
      addFolderToQueue,
      addFoldersToQueue,
      addPane,
      assignFolderToPane,
      clearPanes,
      panes: workspace.panes,
      queuedFolders: workspace.queuedFolders,
      removeFolder,
      removePane,
      setActivePaneId,
      setPaneIndex,
    }),
    [
      addFolderToQueue,
      addFoldersToQueue,
      addPane,
      assignFolderToPane,
      clearPanes,
      removeFolder,
      removePane,
      setActivePaneId,
      setPaneIndex,
      workspace,
    ],
  )

  return (
    <WorkspaceContext.Provider
      value={workspaceProviderValue}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

WorkspaceProvider.propTypes = propTypes

const MemoizedWorkspaceProvider = memo(WorkspaceProvider)

export default MemoizedWorkspaceProvider
