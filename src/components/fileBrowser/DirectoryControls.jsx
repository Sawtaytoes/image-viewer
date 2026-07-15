import { css } from "@emotion/react"
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

const directoryControlsStyles = css`
	align-items: center;
	display: flex;
`

const breadcrumbStyles = css`
	align-items: center;
	display: flex;
	flex: 1 1 auto;
	flex-wrap: wrap;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 400;
	min-width: 0;
	user-select: none;
`

const breadcrumbSegmentStyles = css`
	background: transparent;
	border: 0;
	color: inherit;
	cursor: pointer;
	font: inherit;
	padding: 2px 4px;

	&:hover {
		text-decoration: underline;
	}
`

// The current folder ("you are here") — same metrics as a segment button so the
// trail doesn't shift, but not interactive.
const currentSegmentStyles = css`
	cursor: default;
	font-weight: 600;
	padding: 2px 4px;
`

const breadcrumbSeparatorStyles = css`
	color: #999;
	padding: 0 2px;
`

const navigationStyles = css`
	align-items: center;
	border-radius: 5px;
	cursor: pointer;
	display: inline-flex;
	padding: 4px;

	&:hover {
		background-color: rgba(255, 255, 255, 0.12);
	}

	&:active {
		background-color: rgba(255, 255, 255, 0.2);
	}
`

// Sort-order toggle: icon + the current order's label so the state is legible
// at a glance. Sits between the breadcrumb and the delete action.
const sortToggleStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: inherit;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 400;
	gap: 4px;
	padding: 4px 8px;
	white-space: nowrap;

	&:hover {
		background-color: rgba(255, 255, 255, 0.12);
	}
`

const sortToggleLabels = {
  [sortOrders.modifiedDesc]: "Newest",
  [sortOrders.name]: "Name",
}

// Build the ancestor trail with the real path API (never hand-split — Windows
// drive roots like `G:\` are fiddly). Walk up via `dirname` until it stops
// shortening (the root is its own parent). Returns root → current order.
const buildBreadcrumbSegments = (filePath) => {
  const segments = []

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
    <div css={directoryControlsStyles}>
      {!isRootFilePath && (
        <div
          css={navigationStyles}
          onClick={navigateUpFolderTree}
          title="^ Go up a Directory"
        >
          <ArrowUpwardIcon />
        </div>
      )}

      <div css={breadcrumbStyles}>
        {breadcrumbSegments.map(
          ({ label, path }, index) => {
            const isCurrent =
              index === breadcrumbSegments.length - 1

            return (
              <Fragment key={path}>
                {index > 0 && (
                  <span css={breadcrumbSeparatorStyles}>
                    ›
                  </span>
                )}

                {isCurrent ? (
                  <span css={currentSegmentStyles}>
                    {label}
                  </span>
                ) : (
                  <button
                    css={breadcrumbSegmentStyles}
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

      <button
        css={sortToggleStyles}
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
