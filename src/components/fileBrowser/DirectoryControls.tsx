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
  sortOrders,
} from "../settings/sortOrders"
import DeleteFileModal from "../toolkit/DeleteFileModal"
import FileSystemContext from "./FileSystemContext"

const pathApi = window.api.path

const sortToggleLabels: Record<string, string> = {
  [sortOrders.modifiedDesc]: "Newest",
  [sortOrders.name]: "Name",
}

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

  const { sortOrdersByFolder, toggleSortOrder } =
    useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    filePath,
  )

  const toggleFolderSortOrder = useCallback(() => {
    toggleSortOrder(filePath)
  }, [filePath, toggleSortOrder])

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
      {!isRootFilePath && (
        <div
          className="inline-flex cursor-pointer items-center rounded-[5px] p-1 hover:bg-intent-neutral-surface-hover active:bg-intent-neutral-solid"
          onClick={navigateUpFolderTree}
          title="^ Go up a Directory"
        >
          <ArrowUpwardIcon />
        </div>
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

      {/* Sort-order toggle: icon + the current order's label so the state is
          legible at a glance. Sits between the breadcrumb and the delete
          action. */}
      <button
        className="inline-flex flex-none cursor-pointer items-center gap-1 rounded-[5px] border-0 bg-transparent px-2 py-1 font-normal whitespace-nowrap text-inherit hover:bg-intent-neutral-surface-hover"
        onClick={toggleFolderSortOrder}
        title={
          sortOrder === sortOrders.modifiedDesc
            ? "Sorting by date modified (newest first) — grouped like Explorer. Click to sort by name."
            : "Sorting by name. Click to sort by date modified (newest first)."
        }
        type="button"
      >
        <SortIcon />
        {sortToggleLabels[sortOrder]}
      </button>

      <div onClick={openDeleteFileModal}>
        <DeleteForeverIcon />
      </div>

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
