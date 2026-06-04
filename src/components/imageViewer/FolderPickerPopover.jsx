import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useEffect,
} from "react"

import CloseIcon from "../icons/CloseIcon"
import FolderIcon from "../icons/FolderIcon"
import GridIcon from "../icons/GridIcon"
import WorkspaceContext from "../workspace/WorkspaceContext"

// Rendered inside the pane (no portal): a translucent backdrop over the column
// with the per-column menu — queued folders to assign, plus "open file manager"
// and "close column" escape hatches. This is the Kavita-style center-tap menu.
const backdropFadeIn = keyframes`
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
`

const popoverPopIn = keyframes`
	from {
		opacity: 0;
		transform: scale(0.92);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
`

const backdropStyles = css`
	align-items: center;
	animation: ${backdropFadeIn} 140ms ease;
	background-color: rgba(0, 0, 0, 0.6);
	display: flex;
	inset: 0;
	justify-content: center;
	position: absolute;
	z-index: 1;
`

const popoverStyles = css`
	animation: ${popoverPopIn} 160ms ease;
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
	user-select: none;
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

// The pane's current folder, called out so the user can see which one is loaded.
const activeRowStyles = css`
	background-color: #2a6f97;

	&:hover {
		background-color: #2a6f97;
	}
`

const emptyMessageStyles = css`
	color: #aaa;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	padding: 16px;
`

// Visually separates the folder list from the column actions below it.
const dividerStyles = css`
	background-color: #444;
	flex: 0 0 auto;
	height: 1px;
	margin: 4px 0;
`

const propTypes = {
  currentFolderId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onOpenGallery: PropTypes.func.isRequired,
  paneId: PropTypes.string.isRequired,
}

const FolderPickerPopover = ({
  currentFolderId,
  onClose,
  onOpenGallery,
  paneId,
}) => {
  const {
    assignFolderToPane,
    queuedFolders,
    removePane,
    setActivePaneId,
  } = useContext(WorkspaceContext)

  // Esc closes the menu first (the owning pane's nav keyboard is silenced while
  // we're open, so a later Esc then leaves the viewer).
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  // `click` throughout (not `pointerdown`): selecting a row closes the menu, so
  // firing on press would let the trailing tap events reach whatever ends up
  // under the finger after the menu unmounts.
  const onBackdropClick = useCallback(
    (event) => {
      // Don't let the tap fall through to the column behind the backdrop.
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

      onClose()
    },
    [assignFolderToPane, onClose, paneId, setActivePaneId],
  )

  const openGallery = useCallback(
    (event) => {
      event.stopPropagation()

      onOpenGallery()
    },
    [onOpenGallery],
  )

  const closeColumn = useCallback(
    (event) => {
      event.stopPropagation()

      removePane(paneId)
    },
    [paneId, removePane],
  )

  return (
    <div css={backdropStyles} onClick={onBackdropClick}>
      <div css={popoverStyles}>
        {queuedFolders.length === 0 ? (
          <div css={emptyMessageStyles}>
            No folders queued yet.
          </div>
        ) : (
          queuedFolders.map(({ id, name }) => (
            <button
              css={css`
								${rowStyles}
								${id === currentFolderId && activeRowStyles}
							`}
              key={id}
              onClick={(event) => {
                pickFolder(event, id)
              }}
              type="button"
            >
              <FolderIcon />
              {name}
            </button>
          ))
        )}

        <div css={dividerStyles} />

        <button
          css={rowStyles}
          onClick={openGallery}
          type="button"
        >
          <GridIcon />
          Gallery view
        </button>

        <button
          css={rowStyles}
          onClick={closeColumn}
          type="button"
        >
          <CloseIcon />
          Close column
        </button>
      </div>
    </div>
  )
}

FolderPickerPopover.propTypes = propTypes

const MemoizedFolderPickerPopover = memo(
  FolderPickerPopover,
)

export default MemoizedFolderPickerPopover
