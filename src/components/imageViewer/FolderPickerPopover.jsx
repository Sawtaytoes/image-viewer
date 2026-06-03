import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useCallback, useContext } from "react"

import FolderIcon from "../icons/FolderIcon"
import WorkspaceContext from "../workspace/WorkspaceContext"

// Rendered inside the pane (no portal): a translucent backdrop over the column
// with a list of queued folders to assign to this pane.
const backdropStyles = css`
	align-items: center;
	background-color: rgba(0, 0, 0, 0.6);
	display: flex;
	inset: 0;
	justify-content: center;
	position: absolute;
	z-index: 1;
`

const popoverStyles = css`
	background-color: #2b2b2b;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
	gap: 2px;
	max-height: 80%;
	max-width: 90%;
	overflow-y: auto;
	padding: 8px;
`

const rowStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 18px;
	font-weight: 300;
	gap: 8px;
	padding: 10px 14px;
	text-align: left;
	white-space: nowrap;

	&:hover {
		background-color: #3d3d3d;
	}
`

const emptyMessageStyles = css`
	color: #aaa;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	padding: 16px;
`

const propTypes = {
  onClose: PropTypes.func.isRequired,
  paneId: PropTypes.string.isRequired,
}

const FolderPickerPopover = ({ onClose, paneId }) => {
  const {
    assignFolderToPane,
    queuedFolders,
    setActivePaneId,
  } = useContext(WorkspaceContext)

  const onBackdropPointerDown = useCallback(
    (event) => {
      // Don't let the tap fall through to the empty-pane affordance behind it.
      event.stopPropagation()

      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  const pickFolder = useCallback(
    (event, folderId) => {
      event.stopPropagation()

      assignFolderToPane(paneId, folderId)

      setActivePaneId(paneId)
    },
    [assignFolderToPane, paneId, setActivePaneId],
  )

  return (
    <div
      css={backdropStyles}
      onPointerDown={onBackdropPointerDown}
    >
      <div css={popoverStyles}>
        {queuedFolders.length === 0 ? (
          <div css={emptyMessageStyles}>
            No folders queued yet.
          </div>
        ) : (
          queuedFolders.map(({ id, name }) => (
            <button
              css={rowStyles}
              key={id}
              onPointerDown={(event) => {
                pickFolder(event, id)
              }}
              type="button"
            >
              <FolderIcon />
              {name}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

FolderPickerPopover.propTypes = propTypes

const MemoizedFolderPickerPopover = memo(
  FolderPickerPopover,
)

export default MemoizedFolderPickerPopover
