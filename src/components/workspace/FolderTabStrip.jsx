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
	background-color: #333;
	display: flex;
	gap: 4px;
	overflow-x: auto;
	padding: 4px;
	touch-action: pan-x;
	white-space: nowrap;
`

const tabStyles = css`
	align-items: center;
	background-color: #555;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	gap: 4px;
	padding: 4px 4px 4px 10px;
	user-select: none;
`

const activeTabStyles = css`
	background-color: #2a6f97;
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
	height: 24px;
	justify-content: center;
	padding: 0;
	width: 24px;

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
  )
}

const MemoizedFolderTabStrip = memo(FolderTabStrip)

export default MemoizedFolderTabStrip
