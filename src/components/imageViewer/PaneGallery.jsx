import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import {
  Fragment,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import groupEntriesByDate from "../fileBrowser/dateGroups"
import MultiSelectContext from "../fileBrowser/MultiSelectContext"
import sortDirectoryEntries from "../fileBrowser/sortDirectoryEntries"
import useFolderListing from "../fileBrowser/useFolderListing"
import ArrowUpwardIcon from "../icons/ArrowUpwardIcon"
import CloseIcon from "../icons/CloseIcon"
import PlayArrowIcon from "../icons/PlayArrowIcon"
import SortIcon from "../icons/SortIcon"
import SettingsContext from "../settings/SettingsContext"
import {
  getFolderSortOrder,
  sortOrders,
} from "../settings/sortOrders"
import Button from "../toolkit/Button"
import WorkspaceContext from "../workspace/WorkspaceContext"
import PaneGalleryFolderTile from "./PaneGalleryFolderTile"
import PaneGalleryImageTile from "./PaneGalleryImageTile"

const pathApi = window.api.path

const fadeIn = keyframes`
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
`

const galleryStyles = css`
	animation: ${fadeIn} 160ms ease;
	background-color: #444;
	color: #fafafa;
	display: flex;
	flex-direction: column;
	height: 100%;
	position: absolute;
	inset: 0;
	width: 100%;
`

const headerStyles = css`
	align-items: center;
	background-color: #2b2b2b;
	display: flex;
	flex: 0 0 auto;
	gap: 4px;
	padding: 6px 8px;
`

const iconButtonStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	display: flex;
	padding: 4px;

	&:hover {
		background-color: #3d3d3d;
	}
`

const titleStyles = css`
	flex: 1 1 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 600;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

// Sort-order toggle: icon + the current order's label, mirroring the file
// browser's DirectoryControls so the gallery sorts the same folder the same way.
const sortToggleStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 15px;
	font-weight: 600;
	gap: 4px;
	padding: 4px 8px;
	white-space: nowrap;

	&:hover {
		background-color: #3d3d3d;
	}
`

const sortToggleLabels = {
  [sortOrders.modifiedDesc]: "Newest",
  [sortOrders.name]: "Name",
}

// Thumbnails are sized by a fixed minimum track, not a fraction of the pane, so
// each tile stays the same physical size whether the gallery fills the window or
// shares it with several panes — a narrower pane shows fewer columns rather than
// shrinking every tile. Keeping tiles large also bounds how many decode at once,
// which is what made many-pane layouts crawl.
const gridStyles = css`
	align-content: start;
	display: grid;
	flex: 1 1 auto;
	gap: 2px;
	grid-template-columns: repeat(
		auto-fill,
		minmax(220px, 1fr)
	);
	overflow-y: auto;
	padding: 2px;
`

// Full-width date-bucket heading spanning every grid column.
const groupHeaderStyles = css`
	align-items: end;
	color: #d6d6d6;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 15px;
	font-weight: 600;
	grid-column: 1 / -1;
	padding: 10px 6px 4px;

	&:not(:first-of-type) {
		border-top: 1px solid #555;
		margin-top: 4px;
		padding-top: 10px;
	}
`

const emptyMessageStyles = css`
	color: #aaa;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	padding: 24px;
	text-align: center;
`

const spin = keyframes`
	to {
		transform: rotate(360deg);
	}
`

// Centered spinner shown while a folder's listing is still being read, so
// climbing into a slow directory reads as "loading" rather than "stuck".
const loadingStyles = css`
	align-items: center;
	display: flex;
	flex: 1 1 auto;
	justify-content: center;
	padding: 24px;

	&::after {
		animation: ${spin} 700ms linear infinite;
		border: 3px solid #666;
		border-radius: 50%;
		border-top-color: #fafafa;
		content: '';
		height: 28px;
		width: 28px;
	}
`

const actionBarSlideIn = keyframes`
	from {
		opacity: 0;
		transform: translate(-50%, 20px);
	}
	to {
		opacity: 1;
		transform: translate(-50%, 0);
	}
`

const actionBarStyles = css`
	align-items: center;
	animation: ${actionBarSlideIn} 200ms ease;
	background-color: rgba(51, 51, 51, 0.95);
	border-radius: 12px;
	bottom: 16px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	display: flex;
	gap: 12px;
	left: 50%;
	max-width: 90%;
	padding: 10px 16px;
	position: absolute;
	transform: translateX(-50%);
	z-index: 2;
`

const actionButtonContentStyles = css`
	align-items: center;
	display: inline-flex;
	gap: 4px;
	justify-content: center;
`

// Reused as both the initial value and the cleared value — toggling always
// builds a fresh Set, so this is never mutated.
const initialSelectedFolderPaths = new Set()

const propTypes = {
  // Where to start browsing (the column's current folder, or a drive root).
  folderPath: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  // (folderPath, imageIndex) — the folder being browsed and the tapped image's
  // index within that folder's listing.
  onOpenImage: PropTypes.func.isRequired,
}

// The regular gallery, rendered inside a single column instead of a full-screen
// overlay. Browse folders (tap to drill in, up-button to climb), tap an image
// to jump the column to it, or long-press folders to queue several at once.
const PaneGallery = ({
  folderPath,
  onClose,
  onOpenImage,
}) => {
  const [browsePath, setBrowsePath] = useState(folderPath)

  const [isMultiSelectMode, setIsMultiSelectMode] =
    useState(false)

  const [selectedFolderPaths, setSelectedFolderPaths] =
    useState(initialSelectedFolderPaths)

  const { addFoldersToQueue } = useContext(WorkspaceContext)

  const { sortOrdersByFolder, toggleSortOrder } =
    useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    browsePath,
  )

  const toggleFolderSortOrder = useCallback(() => {
    toggleSortOrder(browsePath)
  }, [browsePath, toggleSortOrder])

  const { directories, imageFiles, isLoading } =
    useFolderListing(browsePath)

  const isGroupedView =
    sortOrder === sortOrders.modifiedDesc

  // Folders + images interleaved newest-first and split into date buckets,
  // mirroring the home gallery's grouped view (built only when grouping).
  const dateGroups = useMemo(() => {
    if (!isGroupedView) {
      return []
    }

    const combinedEntries = sortDirectoryEntries(
      [
        ...directories.map((directory) => ({
          ...directory,
          kind: "directory",
        })),
        ...imageFiles.map((imageFile) => ({
          ...imageFile,
          kind: "image",
        })),
      ],
      sortOrders.modifiedDesc,
    )

    return groupEntriesByDate(combinedEntries)
  }, [directories, imageFiles, isGroupedView])

  const parentPath = pathApi.dirname(browsePath)
  const canGoUp =
    Boolean(parentPath) && parentPath !== browsePath

  const enterMultiSelect = useCallback(() => {
    setIsMultiSelectMode(true)
  }, [])

  const toggleFolder = useCallback((targetPath) => {
    setSelectedFolderPaths((previousPaths) => {
      const nextPaths = new Set(previousPaths)

      if (nextPaths.has(targetPath)) {
        nextPaths.delete(targetPath)
      } else {
        nextPaths.add(targetPath)
      }

      return nextPaths
    })
  }, [])

  const clearMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false)

    setSelectedFolderPaths(initialSelectedFolderPaths)
  }, [])

  // Drilling into a folder while selecting would be confusing, so navigation is
  // disabled in multi-select; tiles toggle instead (see PaneGalleryFolderTile).
  const openFolder = useCallback((targetPath) => {
    setBrowsePath(targetPath)
  }, [])

  // A selection is scoped to the folder it started in: `queueSelectedFolders`
  // only queues paths still in the current `directories`, so a selection
  // carried up into another folder would silently drop. Reset it on navigation
  // rather than stranding stale checkmarks. (Queue more by selecting, opening,
  // then climbing and selecting again — the queue dedupes and appends.)
  const goUp = useCallback(() => {
    if (canGoUp) {
      clearMultiSelect()

      setBrowsePath(parentPath)
    }
  }, [canGoUp, clearMultiSelect, parentPath])

  const openImage = useCallback(
    (filePath) => {
      const imageIndex = imageFiles.findIndex(
        (imageFile) => imageFile.path === filePath,
      )

      onOpenImage(browsePath, Math.max(0, imageIndex))
    },
    [browsePath, imageFiles, onOpenImage],
  )

  const queueSelectedFolders = useCallback(() => {
    addFoldersToQueue(
      directories.filter(({ path }) =>
        selectedFolderPaths.has(path),
      ),
    )

    clearMultiSelect()
  }, [
    addFoldersToQueue,
    clearMultiSelect,
    directories,
    selectedFolderPaths,
  ])

  // Esc backs out a step at a time: drop a multi-select, then climb a folder,
  // then leave the gallery. (The owning pane's viewer keyboard is silenced
  // while the gallery is open.)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== "Escape") {
        return
      }

      if (isMultiSelectMode) {
        clearMultiSelect()
      } else if (canGoUp) {
        setBrowsePath(parentPath)
      } else {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [
    canGoUp,
    clearMultiSelect,
    isMultiSelectMode,
    onClose,
    parentPath,
  ])

  const multiSelectProviderValue = useMemo(
    () => ({
      enterMultiSelect,
      isMultiSelectMode,
      selectedFolderPaths,
      toggleFolder,
    }),
    [
      enterMultiSelect,
      isMultiSelectMode,
      selectedFolderPaths,
      toggleFolder,
    ],
  )

  const title = pathApi.basename(browsePath) || browsePath

  const selectedCount = selectedFolderPaths.size

  const isEmpty =
    directories.length === 0 && imageFiles.length === 0

  return (
    <MultiSelectContext.Provider
      value={multiSelectProviderValue}
    >
      <div css={galleryStyles}>
        <div css={headerStyles}>
          <button
            css={iconButtonStyles}
            disabled={!canGoUp}
            onClick={goUp}
            title="Go up a directory"
            type="button"
          >
            <ArrowUpwardIcon />
          </button>

          <span css={titleStyles}>{title}</span>

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

          <button
            css={iconButtonStyles}
            onClick={onClose}
            title="Close gallery"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        {isLoading ? (
          <div css={loadingStyles} />
        ) : isEmpty ? (
          <div css={emptyMessageStyles}>
            This folder is empty.
          </div>
        ) : (
          <div css={gridStyles}>
            {isGroupedView ? (
              dateGroups.map((group) => (
                <Fragment key={group.key}>
                  <div css={groupHeaderStyles}>
                    {group.label}
                  </div>

                  {group.items.map((entry) =>
                    entry.kind === "directory" ? (
                      <PaneGalleryFolderTile
                        directoryName={entry.name}
                        directoryPath={entry.path}
                        key={entry.path}
                        onOpen={openFolder}
                      />
                    ) : (
                      <PaneGalleryImageTile
                        fileName={entry.name}
                        filePath={entry.path}
                        key={entry.path}
                        onOpen={openImage}
                      />
                    ),
                  )}
                </Fragment>
              ))
            ) : (
              <Fragment>
                {directories.map(({ name, path }) => (
                  <PaneGalleryFolderTile
                    directoryName={name}
                    directoryPath={path}
                    key={path}
                    onOpen={openFolder}
                  />
                ))}

                {imageFiles.map(({ name, path }) => (
                  <PaneGalleryImageTile
                    fileName={name}
                    filePath={path}
                    key={path}
                    onOpen={openImage}
                  />
                ))}
              </Fragment>
            )}
          </div>
        )}

        {isMultiSelectMode && selectedCount > 0 && (
          <div css={actionBarStyles}>
            <Button
              onClick={queueSelectedFolders}
              type="positive"
            >
              <span css={actionButtonContentStyles}>
                <PlayArrowIcon />
                Open {selectedCount} folders
              </span>
            </Button>

            <Button
              onClick={clearMultiSelect}
              type="negative"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </MultiSelectContext.Provider>
  )
}

PaneGallery.propTypes = propTypes

const MemoizedPaneGallery = memo(PaneGallery)

export default MemoizedPaneGallery
