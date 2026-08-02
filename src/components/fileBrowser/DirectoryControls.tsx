import {
  IconButton,
  Select,
  Tooltip,
} from "@charcuterie/ui"
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
  sortOrderOptions,
} from "../settings/sortOrders"
import DeleteFileModal from "../toolkit/DeleteFileModal"
import FileSystemContext from "./FileSystemContext"

const pathApi = window.api.path

// `Select`'s root is `w-full`, and the `className` it takes lands on the
// `<select>` rather than that root — so the width belongs to this wrapper.
const sortPickerClassName =
  "flex w-[132px] flex-none items-center gap-1"

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

  // `isSortOrder` narrows the `Select`'s raw string back to the union without a
  // cast — see the matching handler in `PaneGallery`.
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
                  <span className="cursor-default px-1 py-0.5 font-semibold">
                    {label}
                  </span>
                ) : (
                  <button
                    className="cursor-pointer border-0 bg-transparent px-1 py-0.5 text-inherit hover:underline"
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

      {/* Sort-order picker. `key={filePath}` re-seeds the uncontrolled
          `<select>` because the order is stored per folder path — navigating is
          a second writer, and without it the control would keep showing the
          previous folder's choice. */}
      <div className={sortPickerClassName}>
        <SortIcon />

        <Select
          key={filePath}
          label="Sort order"
          onChange={changeFolderSortOrder}
          options={sortOrderOptions}
          size="sm"
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
