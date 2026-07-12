import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useMemo,
} from "react"

import CloseIcon from "../icons/CloseIcon"
import WorkspaceContext from "./WorkspaceContext"

const tabStripStyles = css`
	align-items: center;
	background-color: #333;
	display: flex;
	gap: 4px;
	padding: 4px;
`

// The tabs scroll horizontally; the Clear-queue action sits outside this so it
// stays pinned and visible no matter how many tabs are queued.
const tabListStyles = css`
	display: flex;
	flex: 1 1 auto;
	gap: 4px;
	overflow-x: auto;
	touch-action: pan-x;
	white-space: nowrap;
`

const clearQueueButtonStyles = css`
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #d6d6d6;
	cursor: pointer;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 400;
	padding: 6px 10px;
	white-space: nowrap;

	&:hover {
		background-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}
`

// Sized up from the original compact chip: the queue auto-hides, so when it is
// up the tabs need to be a comfortable touch target rather than a tiny pill.
const tabStyles = css`
	align-items: center;
	background-color: #555;
	border-radius: 6px;
	color: #fafafa;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 18px;
	font-weight: 300;
	gap: 6px;
	padding: 8px 8px 8px 14px;
	user-select: none;
`

const activeTabStyles = css`
	background-color: #3d9be0;
`

const tabNameStyles = css`
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
`

const closeButtonStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 50%;
	color: inherit;
	cursor: pointer;
	display: inline-flex;
	height: 30px;
	justify-content: center;
	padding: 0;
	width: 30px;

	&:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}
`

const folderTabPropTypes = {
  folderId: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
}

const FolderTab = ({
  folderId,
  isActive,
  name,
  onClose,
  onSelect,
}) => {
  const composedTabStyles = useMemo(
    () => css`
			${tabStyles}
			${isActive && activeTabStyles}
		`,
    [isActive],
  )

  const handleSelect = useCallback(() => {
    onSelect(folderId)
  }, [folderId, onSelect])

  const handleClose = useCallback(
    (event) => {
      event.stopPropagation()

      onClose(folderId)
    },
    [folderId, onClose],
  )

  return (
    <div css={composedTabStyles} onClick={handleSelect}>
      <span css={tabNameStyles}>{name}</span>

      <button
        aria-label={`Close ${name}`}
        css={closeButtonStyles}
        onClick={handleClose}
        type="button"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

FolderTab.propTypes = folderTabPropTypes

const MemoizedFolderTab = memo(FolderTab)

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
    (folderId) => {
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
    <div css={tabStripStyles}>
      <div css={tabListStyles}>
        {queuedFolders.map(({ id, name }) => (
          <MemoizedFolderTab
            folderId={id}
            isActive={id === activeFolderId}
            key={id}
            name={name}
            onClose={removeFolder}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <button
        css={clearQueueButtonStyles}
        onClick={clearQueue}
        title="Remove every folder from the queue"
        type="button"
      >
        Clear queue
      </button>
    </div>
  )
}

const MemoizedFolderTabStrip = memo(FolderTabStrip)

export default MemoizedFolderTabStrip
