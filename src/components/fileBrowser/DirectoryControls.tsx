import { IconButton, Tooltip } from "@charcuterie/ui"
import {
  Fragment,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

import ArrowUpwardIcon from "../icons/ArrowUpwardIcon"
import DeleteForeverIcon from "../icons/DeleteForeverIcon"
import SortIcon from "../icons/SortIcon"
import SettingsContext from "../settings/SettingsContext"
import {
  getFolderSortOrder,
  isSortOrder,
} from "../settings/sortOrders"
import DeleteFileModal from "../toolkit/DeleteFileModal"
import FileSystemContext from "./FileSystemContext"
import SortOrderSelect from "./SortOrderSelect"

const pathApi = window.api.path

// `SortOrderSelect`'s trigger is `w-full`, so the fixed width belongs to this
// wrapper, which also holds the leading `SortIcon`.
const sortPickerClassName =
  "flex w-[132px] flex-none items-center gap-1"

// Shared metrics for every breadcrumb rung so the trail doesn't shift between
// the current segment and the clickable ones. `min-w-[2rem]` + `text-center`
// give a real tap target even to a one-character root label (the POSIX `/`,
// which was ~1ch and near-impossible to hit); the padding lifts the rest toward
// this touch-first app's target size.
const breadcrumbSegmentClassName =
  "inline-flex min-w-[2rem] items-center justify-center rounded-[5px] px-2 py-1 text-center"

// One rung of the ancestor trail: what to show, and where clicking it goes.
interface BreadcrumbSegment {
  label: string
  path: string
}

// Build the ancestor trail with the real path API (never hand-split — Windows
// drive roots like `G:\` are fiddly). Walk up via `dirname` until it stops
// shortening (the root is its own parent). Returns root → current order.
const buildBreadcrumbSegments = (
  filePath: string,
): BreadcrumbSegment[] => {
  const segments: BreadcrumbSegment[] = []

  let current = filePath

  // Bounded so a misbehaving `dirname` can never spin forever.
  for (let depth = 0; depth < 64; depth += 1) {
    segments.unshift({
      label:
        pathApi.basename(current) ||
        // Drive/POSIX root: basename is empty, so show the path with any
        // trailing separator stripped (`G:\` → `G:`, `/` → `/`).
        current.replace(/[\\/]+$/, "") ||
        current,
      path: current,
    })

    const parent = pathApi.dirname(current)

    if (parent === current) {
      break
    }

    current = parent
  }

  return segments
}

const DirectoryControls = () => {
  const {
    filePath,
    isRootFilePath,
    navigateUpFolderTree,
    setFilePath,
  } = useContext(FileSystemContext)

  const { setSortOrder, sortOrdersByFolder } =
    useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    filePath,
  )

  // `isSortOrder` narrows `SortOrderSelect`'s raw string back to the union
  // without a cast — see the matching handler in `PaneGallery`.
  const changeFolderSortOrder = useCallback(
    (nextSortOrder: string) => {
      if (isSortOrder(nextSortOrder)) {
        setSortOrder(filePath, nextSortOrder)
      }
    },
    [filePath, setSortOrder],
  )

  const breadcrumbSegments = useMemo(
    () =>
      filePath ? buildBreadcrumbSegments(filePath) : [],
    [filePath],
  )

  const [
    isDeleteFileModalVisible,
    setIsDeleteFileModalVisible,
  ] = useState(false)

  const closeDeleteFileModal = useCallback(() => {
    setIsDeleteFileModalVisible(false)
  }, [])

  const openDeleteFileModal = useCallback(() => {
    setIsDeleteFileModalVisible(true)
  }, [])

  const deleteFolder = useCallback(() => {
    window.api
      .deleteFilePath({ filePath, isDirectory: true })
      .then(navigateUpFolderTree)
      .then(closeDeleteFileModal)
  }, [closeDeleteFileModal, filePath, navigateUpFolderTree])

  return (
    <div className="flex items-center">
      {/* Was a bare `<div onClick>`: not focusable, not in the tab order, no
          accessible name, and unreachable by the Enter/Space every other
          control in this bar answers to. `IconButton` is a real `<button>` with
          `aria-label`. */}
      {!isRootFilePath && (
        <Tooltip label="Go up a directory">
          <IconButton
            appearance="ghost"
            intent="neutral"
            label="Go up a directory"
            onClick={navigateUpFolderTree}
            size="sm"
          >
            <ArrowUpwardIcon />
          </IconButton>
        </Tooltip>
      )}

      <div className="flex min-w-0 flex-auto flex-wrap items-center font-normal select-none">
        {breadcrumbSegments.map(
          ({ label, path }, index) => {
            const isCurrent =
              index === breadcrumbSegments.length - 1

            return (
              <Fragment key={path}>
                {index > 0 && (
                  <span className="px-0.5 text-content-muted">
                    ›
                  </span>
                )}

                {isCurrent ? (
                  // The current folder ("you are here") — same metrics as a
                  // segment button so the trail doesn't shift, but not
                  // interactive.
                  <span
                    className={`${breadcrumbSegmentClassName} cursor-default font-semibold`}
                  >
                    {label}
                  </span>
                ) : (
                  // An ancestor rung — clickable to jump straight to that
                  // folder. Carry a persistent link affordance
                  // (`text-intent-accent-content`) so it *reads* as a link at
                  // rest, not just on hover; #11 had dropped it to `text-inherit`
                  // + a hover-only background, which left the ancestors looking
                  // like plain text even though they were still buttons.
                  <button
                    className={`${breadcrumbSegmentClassName} cursor-pointer border-0 bg-transparent text-intent-accent-content hover:bg-intent-neutral-surface-hover hover:underline`}
                    onClick={() => {
                      setFilePath(path)
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                )}
              </Fragment>
            )
          },
        )}
      </div>

      {/* Sort-order picker. `SortOrderSelect` is controlled by `value`, so it
          re-seeds itself when the per-folder order changes on navigation — no
          `key` remount is needed the way the uncontrolled native `<select>`
          required one. */}
      <div className={sortPickerClassName}>
        <SortIcon />

        <SortOrderSelect
          onChange={changeFolderSortOrder}
          value={sortOrder}
        />
      </div>

      {/* The other bare `<div onClick>`, and the worse of the two: it deletes
          the current folder and had no name, no focus and no keyboard path at
          all. */}
      <Tooltip label="Delete this folder">
        <IconButton
          appearance="ghost"
          intent="danger"
          label="Delete this folder"
          onClick={openDeleteFileModal}
          size="sm"
        >
          <DeleteForeverIcon />
        </IconButton>
      </Tooltip>

      <DeleteFileModal
        isVisible={isDeleteFileModalVisible}
        onClose={closeDeleteFileModal}
        onConfirm={deleteFolder}
      />
    </div>
  )
}

const MemoizedDirectoryControls = memo(DirectoryControls)

export default MemoizedDirectoryControls
