import type { MouseEvent, MouseEventHandler } from "react"
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { QueuedFolder } from "../../types"
import CloseIcon from "../icons/CloseIcon"
import DeleteForeverIcon from "../icons/DeleteForeverIcon"
import FolderIcon from "../icons/FolderIcon"
import GridIcon from "../icons/GridIcon"
import DeleteFileModal from "../toolkit/DeleteFileModal"
import WorkspaceContext from "../workspace/WorkspaceContext"

// A menu row, minus its colours. The destructive row and the ordinary rows
// disagree on `text-*` and `hover:bg-*`, and two competing utilities on one
// element resolve by stylesheet order rather than `className` order — so the
// colours are appended per row instead of layered on top of a shared block the
// way the Emotion `css` composition did it.
const MENU_ROW_CLASSES =
  "flex cursor-pointer items-center gap-3.5 rounded-[7px] border-0 bg-transparent px-[22px] py-4 text-left text-[24px] font-light whitespace-nowrap"

const NEUTRAL_ROW_CLASSES =
  "text-content-primary hover:bg-surface-raised"

// The single, deliberate folder-delete action (bottom of the menu, not per row):
// trashes the current column's folder from disk after a confirm. Reddened so the
// destructive action reads as distinct from the harmless menu rows.
const DELETE_ROW_CLASSES =
  "text-intent-danger-content hover:bg-intent-danger-surface"

// A queued folder is a flex row: the folder picker (most of the width) plus a
// trailing remove-from-queue button, so the picker can't be a single <button>
// (no button-in-button). The container carries the open-state highlights.
const QUEUED_ROW_CLASSES =
  "flex items-center gap-1 rounded-[7px] pr-2"

// The pane's current folder, called out so the user can see which one is loaded.
const ACTIVE_ROW_CLASSES = "bg-intent-accent-solid"

// A folder already loaded in a *different* column. Not the full active-row
// treatment (that's reserved for this pane) — just a left accent rail and a
// trailing dot so the user knows it's open elsewhere before re-opening it.
const OPEN_ELSEWHERE_ROW_CLASSES =
  "shadow-[inset_3px_0_0_var(--color-intent-accent-solid)]"

// The folder-picking part of the row; fills the row and ellipsizes long names.
const PICK_FOLDER_BUTTON_CLASSES =
  "flex min-w-0 flex-auto cursor-pointer items-center gap-3.5 rounded-[7px] border-0 bg-transparent px-[22px] py-4 text-left text-[24px] font-light text-content-primary hover:bg-intent-neutral-surface-hover"

// The one per-row action: drop the folder from the queue. Immediate — no
// confirmation, since it doesn't touch any files. A big, finger-sized hit area
// (folder deletion lives in a separate, deliberate action below to keep this
// from being a delete-by-accident). The explicit content colour is deliberate:
// the row container sets none of its own, so inheriting left the ✕ at the
// document default and invisible on the dark menu.
const REMOVE_FROM_QUEUE_BUTTON_CLASSES =
  "inline-flex h-12 w-12 flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-content-secondary hover:bg-intent-neutral-surface-hover hover:text-content-primary"

interface FolderPickerPopoverProps {
  currentFolderId?: string | null
  onClose: () => void
  onOpenGallery: () => void
  paneId: string
}

const FolderPickerPopover = ({
  currentFolderId,
  onClose,
  onOpenGallery,
  paneId,
}: FolderPickerPopoverProps) => {
  const {
    assignFolderToPane,
    deleteFolder,
    panes,
    queuedFolders,
    removeFolder,
    removePane,
    setActivePaneId,
  } = useContext(WorkspaceContext)

  // The folder pending disk deletion (the bottom "Delete folder" action opens
  // the confirm); null when no confirm is showing.
  const [folderPendingDelete, setFolderPendingDelete] =
    useState<QueuedFolder | null>(null)

  // This column's loaded folder, if any — the target of the "Delete folder"
  // action and the row that gets the active highlight.
  const currentFolder = useMemo(
    () =>
      queuedFolders.find(
        (folder) => folder.id === currentFolderId,
      ) ?? null,
    [currentFolderId, queuedFolders],
  )

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
    const onKeyDown = (event: KeyboardEvent) => {
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
  const onBackdropClick = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(
    (event) => {
      // Don't let the tap fall through to the column behind the backdrop.
      event.stopPropagation()

      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  // Picking a queued folder from this center-click modal resumes it at its
  // stored "where I left off" index — `assignFolderToPane` owns that restore now,
  // so every entry point (tab strip, modal, auto-loaded column) resumes alike.
  const pickFolder = useCallback(
    (
      event: MouseEvent<HTMLButtonElement>,
      folderId: string,
    ) => {
      event.stopPropagation()

      assignFolderToPane(paneId, folderId)

      setActivePaneId(paneId)

      onClose()
    },
    [assignFolderToPane, onClose, paneId, setActivePaneId],
  )

  const openGallery = useCallback<
    MouseEventHandler<HTMLButtonElement>
  >(
    (event) => {
      event.stopPropagation()

      onOpenGallery()
    },
    [onOpenGallery],
  )

  const removeFromQueue = useCallback(
    (
      event: MouseEvent<HTMLButtonElement>,
      folderId: string,
    ) => {
      event.stopPropagation()

      removeFolder(folderId)
    },
    [removeFolder],
  )

  const closeColumn = useCallback<
    MouseEventHandler<HTMLButtonElement>
  >(
    (event) => {
      event.stopPropagation()

      removePane(paneId)
    },
    [paneId, removePane],
  )

  // Deliberate folder delete: only arms the confirm; the actual disk delete
  // waits for the modal's "Yes" (see `confirmDeleteFolder`).
  const openDeleteFolderConfirm = useCallback<
    MouseEventHandler<HTMLButtonElement>
  >(
    (event) => {
      event.stopPropagation()

      setFolderPendingDelete(currentFolder)
    },
    [currentFolder],
  )

  const closeDeleteFolderModal = useCallback(() => {
    setFolderPendingDelete(null)
  }, [])

  // Trash the folder from disk, then dismiss the modal. `deleteFolder` also
  // dequeues it and auto-loads the next ready folder into the emptied column, so
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
    // Rendered inside the pane (no portal): a translucent backdrop over the
    // column with the per-column menu — queued folders to assign, plus "open
    // file manager" and "close column" escape hatches. This is the Kavita-style
    // center-tap menu.
    <div
      className="absolute inset-0 z-[1] flex animate-backdrop-in items-center justify-center bg-scrim"
      data-viewer-overlay
      onClick={onBackdropClick}
    >
      {/* Sized generously: this is the primary touch target in multi-view, so it
          gets a real minimum width and large rows rather than shrinking to its
          content. Icons are forced larger here (the shared SvgIcon is a fixed
          24px) so they match the bumped-up text. */}
      <div className="flex max-h-[85%] min-w-[460px] max-w-[92%] animate-pop-in flex-col gap-1 overflow-y-auto rounded-[12px] bg-surface-sunken p-3 shadow-[0_8px_24px_var(--color-scrim)] select-none [&_svg]:h-[30px] [&_svg]:w-[30px]">
        {queuedFolders.length === 0 ? (
          <div className="p-5 text-[20px] font-light text-content-muted">
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
                className={`${QUEUED_ROW_CLASSES}${
                  isCurrent ? ` ${ACTIVE_ROW_CLASSES}` : ""
                }${
                  isOpenElsewhere
                    ? ` ${OPEN_ELSEWHERE_ROW_CLASSES}`
                    : ""
                }`}
                key={id}
              >
                <button
                  className={PICK_FOLDER_BUTTON_CLASSES}
                  onClick={(event) => {
                    pickFolder(event, id)
                  }}
                  title={
                    isOpenElsewhere
                      ? `${name} — already open in another column`
                      : undefined
                  }
                  type="button"
                >
                  <FolderIcon />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {name}
                  </span>
                  {isOpenElsewhere && (
                    // Pushed to the row's trailing edge; reads as "this is
                    // already open somewhere".
                    <span className="h-2.5 w-2.5 flex-none rounded-full bg-intent-accent-solid" />
                  )}
                </button>

                <button
                  aria-label={`Remove ${name} from queue`}
                  className={
                    REMOVE_FROM_QUEUE_BUTTON_CLASSES
                  }
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

        {/* Visually separates the folder list from the column actions below. */}
        <div className="my-1.5 h-px flex-none bg-border-default" />

        <button
          className={`${MENU_ROW_CLASSES} ${NEUTRAL_ROW_CLASSES}`}
          onClick={openGallery}
          type="button"
        >
          <GridIcon />
          Gallery view
        </button>

        {currentFolder && (
          <button
            className={`${MENU_ROW_CLASSES} ${DELETE_ROW_CLASSES}`}
            onClick={openDeleteFolderConfirm}
            type="button"
          >
            <DeleteForeverIcon />
            Delete folder
          </button>
        )}

        <button
          className={`${MENU_ROW_CLASSES} ${NEUTRAL_ROW_CLASSES}`}
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

const MemoizedFolderPickerPopover = memo(
  FolderPickerPopover,
)

export default MemoizedFolderPickerPopover
