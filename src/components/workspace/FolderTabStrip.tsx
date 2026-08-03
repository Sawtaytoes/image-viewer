import { Tooltip } from "@charcuterie/ui"
import {
  memo,
  useCallback,
  useContext,
  useMemo,
} from "react"

import FolderTab from "./FolderTab"
import WorkspaceContext from "./WorkspaceContext"

const tabStripClassName =
  "flex items-center gap-1 bg-surface-raised p-1"

// The tabs scroll horizontally; the Clear-queue action sits outside this so it
// stays pinned and visible no matter how many tabs are queued.
const tabListClassName =
  "flex flex-1 gap-1 touch-pan-x overflow-x-auto whitespace-nowrap"

const clearQueueButtonClassName =
  "flex-none cursor-pointer rounded-[5px] border-0 bg-transparent px-[10px] py-1.5 font-normal whitespace-nowrap text-content-secondary hover:bg-intent-neutral-surface-hover hover:text-content-primary"

const FolderTabStrip = () => {
  const {
    activePaneId,
    addPane,
    assignFolderToPane,
    clearQueue,
    panes,
    queuedFolders,
    removeFolder,
    setActivePaneId,
  } = useContext(WorkspaceContext)

  const activeFolderId = useMemo(
    () =>
      panes.find((pane) => pane.id === activePaneId)
        ?.folderId ?? null,
    [activePaneId, panes],
  )

  // Load into the active pane, else the first empty pane, else open a brand new
  // column (this is how a tap from the gallery enters the side-by-side viewer).
  const handleSelect = useCallback(
    (folderId: string) => {
      const targetPane =
        panes.find((pane) => pane.id === activePaneId) ??
        panes.find((pane) => !pane.folderId)

      const targetPaneId = targetPane
        ? targetPane.id
        : addPane().id

      assignFolderToPane(targetPaneId, folderId)

      setActivePaneId(targetPaneId)
    },
    [
      activePaneId,
      addPane,
      assignFolderToPane,
      panes,
      setActivePaneId,
    ],
  )

  if (queuedFolders.length === 0) {
    return null
  }

  return (
    <div className={tabStripClassName}>
      <div className={tabListClassName}>
        {queuedFolders.map(({ id, name }) => (
          <FolderTab
            folderId={id}
            isActive={id === activeFolderId}
            key={id}
            name={name}
            onClose={removeFolder}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* "Clear queue" throws away every tab in one press, and the `title` that
          said so was the only warning — invisible on touch, which is how this
          strip is normally used. */}
      <Tooltip label="Remove every folder from the queue">
        <button
          className={clearQueueButtonClassName}
          onClick={clearQueue}
          type="button"
        >
          Clear queue
        </button>
      </Tooltip>
    </div>
  )
}

const MemoizedFolderTabStrip = memo(FolderTabStrip)

export default MemoizedFolderTabStrip
