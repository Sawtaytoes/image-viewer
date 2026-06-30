import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import CloseIcon from "../icons/CloseIcon"
import DeleteForeverIcon from "../icons/DeleteForeverIcon"
import FolderIcon from "../icons/FolderIcon"
import GridIcon from "../icons/GridIcon"
import DeleteFileModal from "../toolkit/DeleteFileModal"
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

// A queued folder is now a flex row: the folder picker (most of the width) plus
// a trailing remove-from-queue button, so the picker can't be a single <button>
// (no button-in-button). The container carries the open-state highlights.
const queuedFolderRowStyles = css`
	align-items: center;
	border-radius: 5px;
	display: flex;
	gap: 2px;
	padding-right: 6px;
`

// The folder-picking part of the row; fills the row and ellipsizes long names.
const pickFolderButtonStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	display: flex;
	flex: 1 1 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 18px;
	font-weight: 300;
	gap: 8px;
	min-width: 0;
	padding: 10px 14px;
	text-align: left;

	&:hover {
		background-color: rgba(255, 255, 255, 0.08);
	}
`

const folderNameStyles = css`
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

// Small ✕ to drop the folder from the queue. Immediate — no confirmation, since
// it doesn't touch any files (that's what the trashcan is for).
const removeFromQueueButtonStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 50%;
	color: inherit;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	height: 30px;
	justify-content: center;
	padding: 0;
	width: 30px;

	&:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}
`

// Red trashcan beside the ✕: deletes the folder from disk (OS trash) after a
// confirm, vs. the ✕'s queue-only removal. Reddened so the destructive action
// reads as distinct from the harmless remove-from-queue.
const deleteFolderButtonStyles = css`
	color: #ff8a80;

	&:hover {
		background-color: rgba(255, 138, 128, 0.2);
	}
`

// The pane's current folder, called out so the user can see which one is loaded.
const activeRowStyles = css`
	background-color: #2a6f97;
`

// A folder already loaded in a *different* column. Not the full active-row
// treatment (that's reserved for this pane) — just a left accent rail and a
// trailing dot so the user knows it's open elsewhere before re-opening it.
const openElsewhereRowStyles = css`
	box-shadow: inset 3px 0 0 #2a6f97;
`

// Pushed to the row's trailing edge; reads as "this is already open somewhere".
const openElsewhereDotStyles = css`
	background-color: #2a6f97;
	border-radius: 50%;
	flex: 0 0 auto;
	height: 8px;
	margin-left: auto;
	width: 8px;
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
    deleteFolder,
    panes = [],
    queuedFolders,
    removeFolder,
    removePane,
    setActivePaneId,
  } = useContext(WorkspaceContext)

  // The queued folder pending disk deletion (the trashcan opens the confirm);
  // null when no confirm is showing.
  const [folderPendingDelete, setFolderPendingDelete] =
    useState(null)

  // Folder ids loaded in *other* columns, so each row can flag a folder that's
  // already open elsewhere (the current pane's folder gets the active highlight
  // instead, so exclude this pane).
  const folderIdsOpenElsewhere = useMemo(
    () =>
      new Set(
        panes
          .filter(
            (pane) =>
              pane.id !== paneId && pane.folderId != null,
          )
          .map((pane) => pane.folderId),
      ),
    [paneId, panes],
  )

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

  // The one entry point that restores position: picking a queued folder from
  // this center-click modal resumes it at its stored "where I left off" index
  // (clamped later by the pane if the folder shrank). Every other entry point —
  // the tab strip, a gallery tile, a fresh column — still starts at 0. The
  // lookup is async, so close optimistically and assign once it resolves.
  const pickFolder = useCallback(
    (event, folder) => {
      event.stopPropagation()

      setActivePaneId(paneId)

      onClose()

      Promise.resolve(
        window.api.getFolderLastIndex(folder.path),
      ).then((lastIndex) => {
        assignFolderToPane(
          paneId,
          folder.id,
          lastIndex ?? 0,
        )
      })
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

  const removeFromQueue = useCallback(
    (event, folderId) => {
      event.stopPropagation()

      removeFolder(folderId)
    },
    [removeFolder],
  )

  const closeColumn = useCallback(
    (event) => {
      event.stopPropagation()

      removePane(paneId)
    },
    [paneId, removePane],
  )

  // The trashcan only arms the confirm; the actual disk delete waits for the
  // modal's "Yes" (see `confirmDeleteFolder`).
  const requestDeleteFolder = useCallback(
    (event, folder) => {
      event.stopPropagation()

      setFolderPendingDelete(folder)
    },
    [],
  )

  const closeDeleteFolderModal = useCallback(() => {
    setFolderPendingDelete(null)
  }, [])

  // Trash the folder from disk, then dismiss the modal. `deleteFolder` also
  // dequeues it and auto-loads the next ready folder into any emptied pane, so
  // the menu can stay open over the refreshed queue.
  const confirmDeleteFolder = useCallback(() => {
    if (!folderPendingDelete) {
      return
    }

    Promise.resolve(
      deleteFolder(folderPendingDelete.id),
    ).then(() => {
      setFolderPendingDelete(null)
    })
  }, [deleteFolder, folderPendingDelete])

  return (
    <div
      css={backdropStyles}
      data-viewer-overlay
      onClick={onBackdropClick}
    >
      <div css={popoverStyles}>
        {queuedFolders.length === 0 ? (
          <div css={emptyMessageStyles}>
            No folders queued yet.
          </div>
        ) : (
          queuedFolders.map((folder) => {
            const { id, name } = folder
            const isCurrent = id === currentFolderId
            const isOpenElsewhere =
              !isCurrent && folderIdsOpenElsewhere.has(id)

            return (
              <div
                css={css`
									${queuedFolderRowStyles}
									${isCurrent && activeRowStyles}
									${isOpenElsewhere && openElsewhereRowStyles}
								`}
                key={id}
              >
                <button
                  css={pickFolderButtonStyles}
                  onClick={(event) => {
                    pickFolder(event, folder)
                  }}
                  title={
                    isOpenElsewhere
                      ? `${name} — already open in another column`
                      : undefined
                  }
                  type="button"
                >
                  <FolderIcon />
                  <span css={folderNameStyles}>{name}</span>
                  {isOpenElsewhere && (
                    <span css={openElsewhereDotStyles} />
                  )}
                </button>

                <button
                  aria-label={`Delete ${name} from disk`}
                  css={css`
										${removeFromQueueButtonStyles}
										${deleteFolderButtonStyles}
									`}
                  onClick={(event) => {
                    requestDeleteFolder(event, folder)
                  }}
                  title="Delete folder from disk"
                  type="button"
                >
                  <DeleteForeverIcon />
                </button>

                <button
                  aria-label={`Remove ${name} from queue`}
                  css={removeFromQueueButtonStyles}
                  onClick={(event) => {
                    removeFromQueue(event, id)
                  }}
                  title="Remove from queue"
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>
            )
          })
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

      <DeleteFileModal
        isVisible={folderPendingDelete !== null}
        onClose={closeDeleteFolderModal}
        onConfirm={confirmDeleteFolder}
      />
    </div>
  )
}

FolderPickerPopover.propTypes = propTypes

const MemoizedFolderPickerPopover = memo(
  FolderPickerPopover,
)

export default MemoizedFolderPickerPopover
