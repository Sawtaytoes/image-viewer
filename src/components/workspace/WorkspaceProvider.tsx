import type { ReactNode } from "react"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type {
  QueuedFolder,
  SavedQueue,
  SavedQueueLayout,
} from "../../types"
import type {
  Pane,
  UnqueuedFolder,
  WorkspaceContextValue,
} from "./WorkspaceContext"
import WorkspaceContext from "./WorkspaceContext"

// This window's slice of the workspace. `queuedFolders` mirrors main's shared
// queue; the other two are local to this window.
interface Workspace {
  activePaneId: string | null
  panes: Pane[]
  queuedFolders: QueuedFolder[]
}

// A pane an auto-fill just populated, paired with the folder that landed in it
// so the caller can resume it to that folder's remembered index.
interface FilledPane {
  folder: QueuedFolder
  paneId: string
}

// How long the chrome ignores hover-reveal after a pane's gallery/menu closes.
// Long enough to swallow the synthetic pointer event Chromium fires when the
// overlay unmounts from under a stationary cursor, short enough to stay out of
// the way of a deliberate hover.
const CHROME_REVEAL_SUPPRESSION_MS = 400

// Renderer-safe id source. Avoids `Date.now()`/`Math.random()` so ids stay
// collision-free and the queue/panes remain serializable.
const createId = () => crypto.randomUUID()

const createPane = (): Pane => ({
  currentIndex: 0,
  folderId: null,
  id: createId(),
})

// Fill every empty pane (`folderId == null`) — newly added OR emptied — with the
// first queued folder that isn't already shown in another pane, so opening a new
// column or severing one picks up the next ready gallery instead of dropping back
// to an empty "Tap to pick folder". Dedupes against the folders other panes hold
// so the same folder isn't auto-opened in two columns; a freshly filled pane also
// counts as taken for the panes after it. Panes already holding a folder, and any
// empty pane with nothing left to load, are returned untouched. Returns the new
// pane list plus the `(paneId, folder)` pairs filled, so the caller can resume
// each to its remembered index (an async lookup the reducer can't do inline).
const fillEmptyPanes = (
  panes: Pane[],
  queuedFolders: QueuedFolder[],
): { filled: FilledPane[]; panes: Pane[] } => {
  const takenFolderIds = new Set(
    panes
      .map((pane) => pane.folderId)
      .filter((folderId) => folderId != null),
  )

  const filled: FilledPane[] = []

  const nextPanes = panes.map((pane) => {
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

    filled.push({ folder: nextFolder, paneId: pane.id })

    return {
      ...pane,
      currentIndex: 0,
      folderId: nextFolder.id,
    }
  })

  return { filled, panes: nextPanes }
}

// The saving window's side of a saved queue: its columns (folder by path, since
// ids are only meaningful within a session) and the "where I left off" image of
// every queued folder. A column's own index is the freshest spot for its
// folder, so it wins over the shared store's copy, which may be another
// window's older one.
const buildSavedQueueLayout = (
  { activePaneId, panes, queuedFolders }: Workspace,
  storedIndexes: (number | null)[],
): SavedQueueLayout => {
  const folderPathById = new Map(
    queuedFolders.map((folder) => [folder.id, folder.path]),
  )

  const savedPanes = panes.map((pane) => ({
    currentIndex: pane.currentIndex,
    folderPath:
      pane.folderId == null
        ? null
        : (folderPathById.get(pane.folderId) ?? null),
  }))

  const lastIndexByPath: Record<string, number> = {}

  queuedFolders.forEach((folder, folderIndex) => {
    const storedIndex = storedIndexes[folderIndex]

    if (storedIndex != null) {
      lastIndexByPath[folder.path] = storedIndex
    }
  })

  for (const { currentIndex, folderPath } of savedPanes) {
    if (folderPath != null) {
      lastIndexByPath[folderPath] = currentIndex
    }
  }

  const activePaneIndex = panes.findIndex(
    (pane) => pane.id === activePaneId,
  )

  return {
    activePaneIndex:
      activePaneIndex === -1 ? null : activePaneIndex,
    lastIndexByPath,
    panes: savedPanes,
  }
}

// The loading window's columns, rebuilt from a saved queue: fresh pane ids,
// each on the folder it showed (matched by path) at the image it was on. A
// folder that is no longer in the queue leaves an empty column rather than a
// missing one, so the layout keeps its shape.
const restoreSavedPanes = (
  saved: SavedQueue,
): Pick<Workspace, "activePaneId" | "panes"> => {
  const folderIdByPath = new Map(
    saved.folders.map((folder) => [folder.path, folder.id]),
  )

  const panes = saved.panes.map((savedPane) => {
    const folderId =
      savedPane.folderPath == null
        ? null
        : (folderIdByPath.get(savedPane.folderPath) ?? null)

    return {
      currentIndex:
        folderId == null ? 0 : savedPane.currentIndex,
      folderId,
      id: createId(),
    }
  })

  return {
    activePaneId:
      panes[saved.activePaneIndex ?? 0]?.id ?? null,
    panes,
  }
}

// Panes are ephemeral: there are none until the user opens a folder into a
// column, and closing the last one drops back to the gallery. The queue
// (queuedFolders / tabs) is the persistent thing.
const createInitialWorkspace = (): Workspace => ({
  activePaneId: null,
  panes: [],
  queuedFolders: [],
})

interface WorkspaceProviderProps {
  children: ReactNode
}

const WorkspaceProvider = ({
  children,
}: WorkspaceProviderProps) => {
  const [workspace, setWorkspace] = useState<Workspace>(
    createInitialWorkspace,
  )

  // Whether a saved queue slot exists on disk, so the title bar can enable its
  // "Load queue" button. Hydrated once on mount and kept live via main's
  // `queue:savedChanged` broadcast (a save in any window lights it up in all).
  const [hasSavedQueue, setHasSavedQueue] = useState(false)

  useEffect(() => {
    let isMounted = true

    Promise.resolve(window.api.queue.hasSaved()).then(
      (isSaved) => {
        if (isMounted) {
          setHasSavedQueue(isSaved)
        }
      },
    )

    const unsubscribe = window.api.queue.onSavedChanged(
      (isSaved) => {
        setHasSavedQueue(isSaved)
      },
    )

    return () => {
      isMounted = false

      unsubscribe()
    }
  }, [])

  // Folder paths currently open in *other* windows (from main). A ref, not state:
  // it only gates which folder an auto-fill *chooses* — it never severs an
  // existing pane (the same folder open in two windows is fine) — so it doesn't
  // need to trigger a re-render. Kept fresh by the mount effect below.
  const foldersOpenElsewhereRef = useRef<Set<string>>(
    new Set(),
  )

  // Queued folders not already open in another window — the candidates a fresh
  // column/window auto-fills from, so opening one lands on the next *unopened*
  // gallery instead of repeating what another monitor already shows.
  const availableQueuedFolders = useCallback(
    (queuedFolders: QueuedFolder[]) =>
      queuedFolders.filter(
        (folder) =>
          !foldersOpenElsewhereRef.current.has(folder.path),
      ),
    [],
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

  // `window.setTimeout` (not the Node overload) returns a number; the ref starts
  // empty, and `clearTimeout(undefined)` is a documented no-op.
  const chromeRevealSuppressionTimerRef = useRef<
    number | undefined
  >(undefined)

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
  // can't queue twice. Optimistically mirror the add locally, then notify main so
  // the shared queue (and every other window) picks it up.
  const addFolderToQueue = useCallback(
    ({ name, path }: UnqueuedFolder) => {
      let addedFolder: QueuedFolder | null = null

      setWorkspace((previousWorkspace) => {
        const isAlreadyQueued =
          previousWorkspace.queuedFolders.some(
            (folder) => folder.path === path,
          )

        if (isAlreadyQueued) {
          return previousWorkspace
        }

        addedFolder = { id: createId(), name, path }

        return {
          ...previousWorkspace,
          queuedFolders: [
            ...previousWorkspace.queuedFolders,
            addedFolder,
          ],
        }
      })

      if (addedFolder) {
        window.api.queue.add(addedFolder)
      }
    },
    [],
  )

  const addFoldersToQueue = useCallback(
    (folders: UnqueuedFolder[]) => {
      let newFolders: QueuedFolder[] = []

      setWorkspace((previousWorkspace) => {
        const queuedPaths = new Set(
          previousWorkspace.queuedFolders.map(
            (folder) => folder.path,
          ),
        )

        newFolders = []

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

      if (newFolders.length > 0) {
        window.api.queue.addMany(newFolders)
      }
    },
    [],
  )

  const setPaneIndex = useCallback(
    (paneId: string, index: number) => {
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
          const folder =
            previousWorkspace.queuedFolders.find(
              (queuedFolder) =>
                queuedFolder.id === pane.folderId,
            )

          if (folder) {
            window.api.setFolderLastIndex(
              folder.path,
              index,
            )
          }
        }

        return {
          ...previousWorkspace,
          panes: previousWorkspace.panes.map(
            (currentPane) =>
              currentPane.id === paneId
                ? { ...currentPane, currentIndex: index }
                : currentPane,
          ),
        }
      })
    },
    [],
  )

  // Resume a pane to a folder's remembered index. The lookup lives in main (async
  // IPC), so this runs after the assignment lands the folder at index 0; on a
  // non-null stored index it nudges the pane there (the pane clamps it to the
  // listing). Every "a folder opened into a column" path routes through here, so
  // the tab strip, the modal pick, and an auto-loaded column all resume alike.
  const resumePaneToFolderIndex = useCallback(
    (paneId: string, folderPath: string) => {
      Promise.resolve(
        window.api.getFolderLastIndex(folderPath),
      ).then((lastIndex) => {
        if (lastIndex != null) {
          setPaneIndex(paneId, lastIndex)
        }
      })
    },
    [setPaneIndex],
  )

  // Resume each pane an auto-fill just populated to its remembered index.
  const resumeFilledPanes = useCallback(
    (filled: FilledPane[]) => {
      filled.forEach(({ folder, paneId }) => {
        resumePaneToFolderIndex(paneId, folder.path)
      })
    },
    [resumePaneToFolderIndex],
  )

  // The queue lives in main and is shared across windows (see main.js). Hydrate
  // this window's mirror once on mount, then keep it in sync with main's
  // `queue:changed` broadcasts. Panes/activePaneId stay local — each window owns
  // its own columns.
  useEffect(() => {
    let isMounted = true

    Promise.all([
      Promise.resolve(window.api.queue.get()),
      Promise.resolve(window.api.openFolders.get()),
    ]).then(([folders, openElsewhere]) => {
      if (!isMounted) {
        return
      }

      // Seed the "open elsewhere" set before the spawn auto-fill below reads it,
      // so a spawned window skips whatever another monitor already shows.
      foldersOpenElsewhereRef.current = new Set(
        openElsewhere,
      )

      setWorkspace((previousWorkspace) => {
        // Don't clobber folders queued locally before this initial fetch
        // resolved: any such add already went to main and its broadcast (via
        // `onChanged`) carries the full canonical queue, so this one-time
        // hydrate only matters while the local mirror is still empty.
        if (previousWorkspace.queuedFolders.length > 0) {
          return previousWorkspace
        }

        const withQueue = {
          ...previousWorkspace,
          queuedFolders: folders,
        }

        // A window spawned onto another display boots straight into the viewer
        // with a single column auto-filled from the next folder not already open
        // in another window.
        if (
          !window.api.isSpawnedViewer ||
          folders.length === 0
        ) {
          return withQueue
        }

        const { filled, panes } = fillEmptyPanes(
          [...withQueue.panes, createPane()],
          availableQueuedFolders(folders),
        )

        if (filled.length > 0) {
          queueMicrotask(() => {
            resumeFilledPanes(filled)
          })
        }

        return { ...withQueue, panes }
      })
    })

    const unsubscribeQueue = window.api.queue.onChanged(
      (folders) => {
        setWorkspace((previousWorkspace) => ({
          ...previousWorkspace,
          queuedFolders: folders,
        }))
      },
    )

    const unsubscribeOpenFolders =
      window.api.openFolders.onChanged((openElsewhere) => {
        foldersOpenElsewhereRef.current = new Set(
          openElsewhere,
        )
      })

    return () => {
      isMounted = false

      unsubscribeQueue()
      unsubscribeOpenFolders()
    }
  }, [availableQueuedFolders, resumeFilledPanes])

  // Panes are per-window but the queue is shared: whenever the mirrored queue
  // changes — including a remove/clear from *another* window — sever any pane whose
  // folder is gone (it reverts to the empty `+` state) and auto-fill freed/empty
  // panes with the next ready queued folder. This is the cross-window replacement
  // for the inline pane-severing the queue mutators used to do. Idempotent: it
  // returns the previous state untouched when nothing needs severing or filling,
  // so it can't loop on its own pane updates.
  useEffect(() => {
    // Read the queue from component scope (the effect's trigger); panes come from
    // the updater's `previousWorkspace`. The two agree here — the queue only ever
    // changes via `setWorkspace`, and pane-only updates don't touch it.
    const currentQueuedFolders = workspace.queuedFolders

    const validFolderIds = new Set(
      currentQueuedFolders.map((folder) => folder.id),
    )

    setWorkspace((previousWorkspace) => {
      let hasChanged = false

      const severedPanes = previousWorkspace.panes.map(
        (pane) => {
          if (
            pane.folderId != null &&
            !validFolderIds.has(pane.folderId)
          ) {
            hasChanged = true

            return {
              ...pane,
              currentIndex: 0,
              folderId: null,
            }
          }

          return pane
        },
      )

      const { filled, panes } = fillEmptyPanes(
        severedPanes,
        availableQueuedFolders(currentQueuedFolders),
      )

      if (filled.length > 0) {
        hasChanged = true

        queueMicrotask(() => {
          resumeFilledPanes(filled)
        })
      }

      if (!hasChanged) {
        return previousWorkspace
      }

      return { ...previousWorkspace, panes }
    })
  }, [
    availableQueuedFolders,
    workspace.queuedFolders,
    resumeFilledPanes,
  ])

  // Report this window's open folder paths to main whenever its panes (or the
  // queue backing their names) change, so other windows can skip them when
  // auto-filling. Derived from panes → folderId → queued path, deduped.
  useEffect(() => {
    const openPaths = new Set<string>()

    for (const pane of workspace.panes) {
      if (pane.folderId == null) {
        continue
      }

      const folder = workspace.queuedFolders.find(
        (queuedFolder) => queuedFolder.id === pane.folderId,
      )

      if (folder) {
        openPaths.add(folder.path)
      }
    }

    window.api.openFolders.set([...openPaths])
  }, [workspace.panes, workspace.queuedFolders])

  // Drop the folder from the shared queue and notify main. Panes aren't severed
  // here: because the queue is shared across windows, the pane-reconciliation
  // effect below reacts to `queuedFolders` shrinking — in *every* window — and
  // severs panes that referenced the removed folder (they revert to the empty `+`
  // state), then auto-loads the next ready queued folder into any emptied pane.
  const removeFolder = useCallback((folderId: string) => {
    setWorkspace((previousWorkspace) => {
      if (
        !previousWorkspace.queuedFolders.some(
          (folder) => folder.id === folderId,
        )
      ) {
        return previousWorkspace
      }

      return {
        ...previousWorkspace,
        queuedFolders:
          previousWorkspace.queuedFolders.filter(
            (folder) => folder.id !== folderId,
          ),
      }
    })

    window.api.queue.remove(folderId)
  }, [])

  // Trash the folder from disk (OS recycle bin) and, on success, drop it from
  // the queue + sever any panes on it + auto-load the next ready folder — the
  // same cleanup as remove-from-queue, but only after the file op resolves so a
  // failed delete leaves the queue untouched. Distinct from `removeFolder` (the
  // ✕), which only touches renderer state.
  const deleteFolder = useCallback(
    (folderId: string): Promise<boolean> => {
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
        .then((isDeleted) => {
          if (isDeleted) {
            removeFolder(folderId)
          }

          return isDeleted
        })
    },
    [removeFolder, workspace.queuedFolders],
  )

  // Empty the whole shared queue at once and notify main. As with `removeFolder`,
  // the pane-reconciliation effect severs every pane that referenced a queued
  // folder (panes revert to the empty `+` state rather than vanishing) in every
  // window once `queuedFolders` empties.
  const clearQueue = useCallback(() => {
    setWorkspace((previousWorkspace) =>
      previousWorkspace.queuedFolders.length === 0
        ? previousWorkspace
        : { ...previousWorkspace, queuedFolders: [] },
    )

    window.api.queue.clear()
  }, [])

  // Discard the saved slot itself (the live queue is untouched). Distinct from
  // `clearQueue`, which closes the *live* queue — this is the "reset the saved
  // one" the save/load/close trio never had. Main broadcasts `savedChanged`, so
  // `hasSavedQueue` drops to false in every window.
  const clearSavedQueue = useCallback(() => {
    window.api.queue.clearSaved()
  }, [])

  // Snapshot the current queue into the saved slot (main persists it and
  // broadcasts the new saved-state). Resolves once written so callers can
  // sequence a clear after it — e.g. the title bar's "Save for later" closes the
  // queue only once the snapshot is safely on disk.
  //
  // The snapshot carries this window's columns and every queued folder's
  // last-viewed image, read from the shared store at save time (a ref, since
  // the save is a click handler and needs the state as of now).
  const workspaceRef = useRef(workspace)

  useEffect(() => {
    workspaceRef.current = workspace
  }, [workspace])

  const saveQueue = useCallback(() => {
    const currentWorkspace = workspaceRef.current

    return Promise.all(
      currentWorkspace.queuedFolders.map((folder) =>
        Promise.resolve(
          window.api.getFolderLastIndex(folder.path),
        ),
      ),
    ).then((storedIndexes) =>
      window.api.queue.save(
        buildSavedQueueLayout(
          currentWorkspace,
          storedIndexes,
        ),
      ),
    )
  }, [])

  // Replace the live queue with the saved slot. Main swaps `queuedFolders`,
  // puts the saved positions back in the shared "where I left off" store, and
  // broadcasts `queue:changed`, so every window's mirror reconciles to the
  // loaded list. This window also gets its saved columns back, each at the
  // image it was on — which opens the viewer, the way it was left. A slot with
  // no columns (saved from the file browser, or before columns were saved)
  // leaves this window's columns to the usual reconciliation.
  const loadQueue = useCallback(() => {
    Promise.resolve(window.api.queue.load()).then(
      (saved) => {
        if (!saved || saved.panes.length === 0) {
          return
        }

        setWorkspace((previousWorkspace) => ({
          ...previousWorkspace,
          ...restoreSavedPanes(saved),
          queuedFolders: saved.folders,
        }))
      },
    )
  }, [])

  const addPane = useCallback(() => {
    const pane = createPane()

    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      panes: [...previousWorkspace.panes, pane],
    }))

    return pane
  }, [])

  // The `+` button's "open a new column": add a pane and immediately auto-load
  // the next queued folder not already open in this window *or another window*
  // (resumed to its remembered index), so a fresh column lands on the next ready
  // gallery instead of an empty "Tap to pick folder". Falls back to an empty pane
  // when nothing's free. Callers that open a *specific* folder (the tab strip, the
  // file browser) use raw `addPane` + an explicit assign instead.
  const addPaneAndFill = useCallback(() => {
    setWorkspace((previousWorkspace) => {
      const panesWithNew = [
        ...previousWorkspace.panes,
        createPane(),
      ]

      const { filled, panes } = fillEmptyPanes(
        panesWithNew,
        availableQueuedFolders(
          previousWorkspace.queuedFolders,
        ),
      )

      if (filled.length > 0) {
        queueMicrotask(() => {
          resumeFilledPanes(filled)
        })
      }

      return { ...previousWorkspace, panes }
    })
  }, [availableQueuedFolders, resumeFilledPanes])

  const removePane = useCallback((paneId: string) => {
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

  // Assign a queued folder to a pane and resume it to that folder's remembered
  // index. Lands at index 0 first, then `resumePaneToFolderIndex` nudges it to
  // the stored spot (clamped later by the pane). Every "open a folder into a
  // column" entry point — the tab strip and the center-click modal — routes
  // through here, so they all resume alike.
  const assignFolderToPane = useCallback(
    (paneId: string, folderId: string) => {
      setWorkspace((previousWorkspace) => {
        const folder = previousWorkspace.queuedFolders.find(
          (queuedFolder) => queuedFolder.id === folderId,
        )

        if (folder) {
          queueMicrotask(() => {
            resumePaneToFolderIndex(paneId, folder.path)
          })
        }

        return {
          ...previousWorkspace,
          panes: previousWorkspace.panes.map((pane) =>
            pane.id === paneId
              ? { ...pane, currentIndex: 0, folderId }
              : pane,
          ),
        }
      })
    },
    [resumePaneToFolderIndex],
  )

  // Assign a folder by path (from a pane's in-pane gallery): queue it, reusing
  // the entry if already queued, then assign it to the pane, set its index
  // (defaults to the first image; the gallery passes the tapped image's index),
  // and make it active — all in one update so the pane and queue never disagree.
  const assignFolderPathToPane = useCallback(
    (
      paneId: string,
      { name, path }: UnqueuedFolder,
      imageIndex = 0,
    ) => {
      let addedFolder: QueuedFolder | null = null

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

        if (!existingFolder) {
          addedFolder = folder
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

      // A brand-new folder must reach the shared queue in main so it exists for
      // other windows and survives a `queue:changed` echo.
      if (addedFolder) {
        window.api.queue.add(addedFolder)
      }
    },
    [],
  )

  const setActivePaneId = useCallback(
    (paneId: string | null) => {
      setWorkspace((previousWorkspace) => ({
        ...previousWorkspace,
        activePaneId: paneId,
      }))
    },
    [],
  )

  // Drop all columns — leaves the immersive viewer back to the gallery.
  const clearPanes = useCallback(() => {
    setWorkspace((previousWorkspace) => ({
      ...previousWorkspace,
      activePaneId: null,
      panes: [],
    }))
  }, [])

  const workspaceProviderValue =
    useMemo<WorkspaceContextValue>(
      () => ({
        activePaneId: workspace.activePaneId,
        addFolderToQueue,
        addFoldersToQueue,
        addPane,
        addPaneAndFill,
        assignFolderPathToPane,
        assignFolderToPane,
        clearPanes,
        clearQueue,
        clearSavedQueue,
        deleteFolder,
        hasSavedQueue,
        isChromeRevealSuppressed,
        loadQueue,
        panes: workspace.panes,
        queuedFolders: workspace.queuedFolders,
        removeFolder,
        removePane,
        saveQueue,
        setActivePaneId,
        setPaneIndex,
        suppressChromeReveal,
      }),
      [
        addFolderToQueue,
        addFoldersToQueue,
        addPane,
        addPaneAndFill,
        assignFolderPathToPane,
        assignFolderToPane,
        clearPanes,
        clearQueue,
        clearSavedQueue,
        deleteFolder,
        hasSavedQueue,
        isChromeRevealSuppressed,
        loadQueue,
        removeFolder,
        removePane,
        saveQueue,
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

const MemoizedWorkspaceProvider = memo(WorkspaceProvider)

export default MemoizedWorkspaceProvider
