import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import WorkspaceContext from "./WorkspaceContext"

// How long the chrome ignores hover-reveal after a pane's gallery/menu closes.
// Long enough to swallow the synthetic pointer event Chromium fires when the
// overlay unmounts from under a stationary cursor, short enough to stay out of
// the way of a deliberate hover.
const CHROME_REVEAL_SUPPRESSION_MS = 400

// Renderer-safe id source. Avoids `Date.now()`/`Math.random()` so ids stay
// collision-free and the queue/panes remain serializable.
const createId = () => crypto.randomUUID()

const createPane = () => ({
  currentIndex: 0,
  folderId: null,
  id: createId(),
})

// Fill every empty pane (`folderId == null`) with the first queued folder that
// isn't already shown in another pane, so a column emptied by remove-from-queue
// or a folder-delete picks up the next ready gallery instead of dropping back to
// an empty "Tap to pick folder". Dedupes against the folders other panes hold so
// the same folder isn't auto-opened in two columns; a freshly filled pane also
// counts as taken for the panes after it. Panes already holding a folder, and
// any empty pane with nothing left to load, are returned untouched.
const fillEmptyPanes = (panes, queuedFolders) => {
  const takenFolderIds = new Set(
    panes
      .map((pane) => pane.folderId)
      .filter((folderId) => folderId != null),
  )

  return panes.map((pane) => {
    if (pane.folderId != null) {
      return pane
    }

    const nextFolder = queuedFolders.find(
      (folder) => !takenFolderIds.has(folder.id),
    )

    if (!nextFolder) {
      return pane
    }

    takenFolderIds.add(nextFolder.id)

    return {
      ...pane,
      currentIndex: 0,
      folderId: nextFolder.id,
    }
  })
}

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

  // Briefly tells the revealable chrome to ignore hover-reveal right after a
  // pane's gallery/menu closes. Closing unmounts an overlay from above the
  // chrome's top hit-strip, and the browser then fires a pointer event on the
  // strip under the (stationary) cursor — which otherwise popped the bar open on
  // every close and covered the close button before the next click landed.
  const [
    isChromeRevealSuppressed,
    setIsChromeRevealSuppressed,
  ] = useState(false)

  const chromeRevealSuppressionTimerRef = useRef()

  const suppressChromeReveal = useCallback(() => {
    window.clearTimeout(
      chromeRevealSuppressionTimerRef.current,
    )

    setIsChromeRevealSuppressed(true)

    chromeRevealSuppressionTimerRef.current =
      window.setTimeout(() => {
        setIsChromeRevealSuppressed(false)
      }, CHROME_REVEAL_SUPPRESSION_MS)
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(
        chromeRevealSuppressionTimerRef.current,
      )
    },
    [],
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
  // vanish — they revert to the empty `+` state), then auto-load the next ready
  // queued folder into any pane the removal emptied. References are by id, so no
  // other pane is corrupted.
  const removeFolder = useCallback((folderId) => {
    setWorkspace((previousWorkspace) => {
      const queuedFolders =
        previousWorkspace.queuedFolders.filter(
          (folder) => folder.id !== folderId,
        )

      const severedPanes = previousWorkspace.panes.map(
        (pane) =>
          pane.folderId === folderId
            ? { ...pane, folderId: null }
            : pane,
      )

      return {
        ...previousWorkspace,
        panes: fillEmptyPanes(severedPanes, queuedFolders),
        queuedFolders,
      }
    })
  }, [])

  // Trash the folder from disk (OS recycle bin) and, on success, drop it from
  // the queue + sever any panes on it + auto-load the next ready folder — the
  // same cleanup as remove-from-queue, but only after the file op resolves so a
  // failed delete leaves the queue untouched. Distinct from `removeFolder` (the
  // ✕), which only touches renderer state.
  const deleteFolder = useCallback(
    (folderId) => {
      const folder = workspace.queuedFolders.find(
        (queuedFolder) => queuedFolder.id === folderId,
      )

      if (!folder) {
        return Promise.resolve(false)
      }

      return window.api
        .deleteFilePath({
          filePath: folder.path,
          isDirectory: true,
        })
        .then((didDelete) => {
          if (didDelete) {
            removeFolder(folderId)
          }

          return didDelete
        })
    },
    [removeFolder, workspace.queuedFolders],
  )

  // Empty the whole queue at once and sever every pane that referenced a queued
  // folder (panes revert to the empty `+` state rather than vanishing), mirroring
  // `removeFolder` applied to all of them.
  const clearQueue = useCallback(() => {
    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      panes: previousWorkspace.panes.map((pane) =>
        pane.folderId ? { ...pane, folderId: null } : pane,
      ),
      queuedFolders: [],
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

  // Assign a queued folder to a pane. Defaults to the first image, so the tab
  // strip's reset-to-0 is unchanged; the center-click modal passes the folder's
  // stored "resume where I left off" index instead (clamped later by the pane).
  const assignFolderToPane = useCallback(
    (paneId, folderId, index = 0) => {
      setWorkspace((previousWorkspace) => ({
        ...previousWorkspace,
        panes: previousWorkspace.panes.map((pane) =>
          pane.id === paneId
            ? { ...pane, currentIndex: index, folderId }
            : pane,
        ),
      }))
    },
    [],
  )

  // Assign a folder by path (from a pane's in-pane gallery): queue it, reusing
  // the entry if already queued, then assign it to the pane, set its index
  // (defaults to the first image; the gallery passes the tapped image's index),
  // and make it active — all in one update so the pane and queue never disagree.
  const assignFolderPathToPane = useCallback(
    (paneId, { name, path }, imageIndex = 0) => {
      setWorkspace((previousWorkspace) => {
        const existingFolder =
          previousWorkspace.queuedFolders.find(
            (folder) => folder.path === path,
          )

        const folder = existingFolder ?? {
          id: createId(),
          name,
          path,
        }

        return {
          ...previousWorkspace,
          activePaneId: paneId,
          panes: previousWorkspace.panes.map((pane) =>
            pane.id === paneId
              ? {
                  ...pane,
                  currentIndex: imageIndex,
                  folderId: folder.id,
                }
              : pane,
          ),
          queuedFolders: existingFolder
            ? previousWorkspace.queuedFolders
            : [...previousWorkspace.queuedFolders, folder],
        }
      })
    },
    [],
  )

  const setPaneIndex = useCallback((paneId, index) => {
    setWorkspace((previousWorkspace) => {
      const pane = previousWorkspace.panes.find(
        (candidate) => candidate.id === paneId,
      )

      // Record the new spot in the cross-window "resume where I left off" store,
      // keyed by the pane's folder path. Only on a real change to a folder-backed
      // pane, so rapid arrow-stepping that re-lands the same index — or a pane
      // with no folder — doesn't spam the bridge. Last write wins across windows.
      if (
        pane &&
        pane.currentIndex !== index &&
        pane.folderId != null
      ) {
        const folder = previousWorkspace.queuedFolders.find(
          (queuedFolder) =>
            queuedFolder.id === pane.folderId,
        )

        if (folder) {
          window.api.setFolderLastIndex(folder.path, index)
        }
      }

      return {
        ...previousWorkspace,
        panes: previousWorkspace.panes.map((currentPane) =>
          currentPane.id === paneId
            ? { ...currentPane, currentIndex: index }
            : currentPane,
        ),
      }
    })
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
      assignFolderPathToPane,
      assignFolderToPane,
      clearPanes,
      clearQueue,
      deleteFolder,
      isChromeRevealSuppressed,
      panes: workspace.panes,
      queuedFolders: workspace.queuedFolders,
      removeFolder,
      removePane,
      setActivePaneId,
      setPaneIndex,
      suppressChromeReveal,
    }),
    [
      addFolderToQueue,
      addFoldersToQueue,
      addPane,
      assignFolderPathToPane,
      assignFolderToPane,
      clearPanes,
      clearQueue,
      deleteFolder,
      isChromeRevealSuppressed,
      removeFolder,
      removePane,
      setActivePaneId,
      setPaneIndex,
      suppressChromeReveal,
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
