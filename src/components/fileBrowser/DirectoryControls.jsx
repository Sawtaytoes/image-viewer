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
	padding: 4px;
`

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
