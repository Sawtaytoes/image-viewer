import { css, keyframes } from "@emotion/react"
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import TITLE_BAR_HEIGHT from "../convenience/titleBarHeight"
import useKeyboardControls from "../convenience/useKeyboardControls"
import CloseIcon from "../icons/CloseIcon"
import PlayArrowIcon from "../icons/PlayArrowIcon"
import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import ImageViewerContext from "../imageViewer/ImageViewerContext"
import SettingsContext from "../settings/SettingsContext"
import {
  getFolderSortOrder,
  sortOrders,
} from "../settings/sortOrders"
import Button from "../toolkit/Button"
import DeleteFileModal from "../toolkit/DeleteFileModal"
import FolderTabStrip from "../workspace/FolderTabStrip"
import WorkspaceContext from "../workspace/WorkspaceContext"
import DateGroupedGrid from "./DateGroupedGrid"
import Directory from "./Directory"
import DirectoryControls from "./DirectoryControls"
import groupEntriesByDate from "./dateGroups"
import FileSystemContext from "./FileSystemContext"
import ImageFile from "./ImageFile"
import MultiSelectContext from "./MultiSelectContext"
import sortDirectoryEntries from "./sortDirectoryEntries"
import VirtualizedList from "./VirtualizedList"

const fileBrowserStyles = css`
	background-color: #444;
	color: #fafafa;
	display: grid;
	/* Sits below the custom title bar, which is a fixed strip at the top. */
	height: calc(100vh - ${TITLE_BAR_HEIGHT}px);
	margin-top: ${TITLE_BAR_HEIGHT}px;
	width: 100%;
	grid-template-rows: auto auto auto 1fr;
`

// Explicit rows (not auto-placement): FolderTabStrip renders null when the queue
// is empty, so pinning the search bar and list to fixed rows keeps them put
// whether or not the tab strip is there.
const searchBarStyles = css`
	align-items: center;
	background-color: #3a3a3a;
	display: flex;
	gap: 8px;
	grid-row: 3;
	padding: 6px 8px;
`

const searchInputStyles = css`
	background-color: #555;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	flex: 1 1 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 15px;
	min-width: 0;
	padding: 8px 12px;

	&::placeholder {
		color: #aaa;
	}

	&:focus {
		outline: 2px solid #3d9be0;
	}
`

const searchClearButtonStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 50%;
	color: #d6d6d6;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	height: 32px;
	justify-content: center;
	padding: 0;
	width: 32px;

	&:hover {
		background-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}
`

// Shown in place of the folder grid while a search is running or has no hits, so
// an empty result set reads as a state rather than a blank window.
const searchStatusStyles = css`
	color: #aaa;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 16px;
	padding: 20px;
`

// Inline "still walking the tree" hint in the search bar — the instant current-
// directory matches already show, so this just signals more may stream in.
const searchPendingStyles = css`
	color: #aaa;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 13px;
	white-space: nowrap;
`

const virtualizedListContainerStyles = css`
	grid-row: 4;
	overflow: hidden;
`

const spin = keyframes`
	to {
		transform: rotate(360deg);
	}
`

// Centered spinner shown while a folder's listing is still being read, so a
// large folder (especially one sorted by date, which stats every file) reads as
// "loading" rather than a blank window.
const loadingStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	width: 100%;

	&::after {
		animation: ${spin} 700ms linear infinite;
		border: 4px solid #555;
		border-radius: 50%;
		border-top-color: #fafafa;
		content: '';
		height: 36px;
		width: 36px;
	}
`

const multiSelectActionBarStyles = css`
	align-items: center;
	background-color: rgba(51, 51, 51, 0.95);
	border-radius: 12px;
	bottom: 24px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	display: flex;
	gap: 16px;
	left: 50%;
	padding: 12px 20px;
	position: fixed;
	transform: translateX(-50%);
	z-index: 9999;
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

const FileBrowser = () => {
  const animationFrameIdRef = useRef()
  const virtualizedListContainerRef = useRef()

  const [
    isDeleteFileModalVisible,
    setIsDeleteFileModalVisible,
  ] = useState(false)

  const [isMultiSelectMode, setIsMultiSelectMode] =
    useState(false)

  const [numberOfColumns, setNumberOfColumns] = useState(1)

  // Folder-name filter over the current directory's whole subtree. Two phases:
  // the current directory's own folders are filtered instantly in-memory (see
  // `localDirectoryMatches`); the deeper subfolder matches stream in from the
  // debounced disk walk (`subfolderResults`). `searchQuery` is what's typed.
  const [searchQuery, setSearchQuery] = useState("")

  const [subfolderResults, setSubfolderResults] = useState(
    [],
  )

  const [isSearchPending, setIsSearchPending] =
    useState(false)

  const [previousFilePath, setPreviousFilePath] =
    useState("")

  const [previousImageFilePath, setPreviousImageFilePath] =
    useState("")

  const [selectedFolderPaths, setSelectedFolderPaths] =
    useState(initialSelectedFolderPaths)

  const [selectedIndex, setSelectedIndex] = useState(0)

  const {
    directories,
    filePath,
    imageFiles,
    isLoading,
    navigateUpFolderTree,
    setFilePath,
  } = useContext(FileSystemContext)

  const { imageFilePath, setImageFile } = useContext(
    ImageViewerContext,
  )

  const { releaseImage, retainImage } = useContext(
    ImageLoaderContext,
  )

  const {
    addFoldersToQueue,
    addPane,
    assignFolderPathToPane,
    panes,
  } = useContext(WorkspaceContext)

  const { sortOrdersByFolder } = useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    filePath,
  )

  const trimmedQuery = searchQuery.trim()

  const isSearching = trimmedQuery.length > 0

  const searchNeedle = trimmedQuery.toLowerCase()

  // Phase 1 — instant: the current directory's folders are already in memory, so
  // filter them synchronously on every keystroke, no disk and no debounce.
  const localDirectoryMatches = useMemo(() => {
    if (!isSearching) {
      return []
    }

    return directories.filter((directory) =>
      directory.name.toLowerCase().includes(searchNeedle),
    )
  }, [directories, isSearching, searchNeedle])

  // Leaving the folder abandons the search — the results belong to the old
  // subtree, and the query box shouldn't linger over a different directory.
  // Compared against a ref (rather than a bare `[filePath]` trigger) so the
  // effect genuinely reads the value it keys on.
  const searchResetPathRef = useRef(filePath)

  useEffect(() => {
    if (searchResetPathRef.current !== filePath) {
      searchResetPathRef.current = filePath

      setSearchQuery("")

      setSubfolderResults([])
    }
  }, [filePath])

  // Phase 2 — debounced disk walk for the deeper matches, streamed in as each
  // directory level is scanned (via `onBatch`) so hits appear progressively
  // rather than all at the end. Each keystroke restarts the timer, and a
  // `cancelled` flag drops any in-flight batch/result whose query has moved on.
  useEffect(() => {
    if (!isSearching) {
      setSubfolderResults([])

      setIsSearchPending(false)

      return undefined
    }

    let cancelled = false

    setSubfolderResults([])

    setIsSearchPending(true)

    const timeoutId = window.setTimeout(() => {
      const onBatch = (matches) => {
        if (cancelled) {
          return
        }

        setSubfolderResults((previous) => [
          ...previous,
          ...matches,
        ])
      }

      Promise.resolve(
        window.api.searchFolders(
          filePath,
          trimmedQuery,
          onBatch,
        ),
      )
        .then((folders) => {
          if (cancelled) {
            return
          }

          // Settle on the authoritative full list (covers the fake FS, which
          // resolves at once without streaming).
          setSubfolderResults(folders)

          setIsSearchPending(false)
        })
        .catch(() => {
          if (cancelled) {
            return
          }

          setIsSearchPending(false)
        })
    }, 250)

    return () => {
      cancelled = true

      window.clearTimeout(timeoutId)
    }
  }, [filePath, isSearching, trimmedQuery])

  // What the list actually renders while searching: the instant current-dir
  // matches first, then the streamed subfolder matches, deduped by path (the
  // walk re-lists the current dir, so its folders can appear in both). Downstream
  // — render, multi-select "open N", the empty state — all read these.
  const displayedDirectories = useMemo(() => {
    if (!isSearching) {
      return directories
    }

    const seenPaths = new Set()
    const merged = []

    for (const directory of [
      ...localDirectoryMatches,
      ...subfolderResults,
    ]) {
      if (seenPaths.has(directory.path)) {
        continue
      }

      seenPaths.add(directory.path)

      merged.push(directory)
    }

    return merged
  }, [
    directories,
    isSearching,
    localDirectoryMatches,
    subfolderResults,
  ])

  const displayedImageFiles = isSearching ? [] : imageFiles

  // Group into Explorer-style date buckets only when sorting by date and
  // actually inside a folder — the drive list at the root has no useful dates.
  // Search results have no dates and are a flat cross-tree list, so never group
  // them.
  const isGroupedView =
    !isSearching &&
    sortOrder === sortOrders.modifiedDesc &&
    Boolean(filePath)

  // Folders and images interleaved into one newest-first sequence, then split
  // into the non-empty date buckets (each `{ key, label, items }`).
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

  const renderGroupedEntry = useCallback(
    (entry) =>
      entry.kind === "directory" ? (
        <Directory
          directoryName={entry.name}
          directoryPath={entry.path}
        />
      ) : (
        <ImageFile
          fileName={entry.name}
          filePath={entry.path}
        />
      ),
    [],
  )

  const closeDeleteFileModal = useCallback(() => {
    setIsDeleteFileModalVisible(false)
  }, [])

  const openDeleteFileModal = useCallback(() => {
    setIsDeleteFileModalVisible(true)
  }, [])

  const enterMultiSelect = useCallback(() => {
    setIsMultiSelectMode(true)
  }, [])

  const toggleFolder = useCallback((folderPath) => {
    setSelectedFolderPaths((previousPaths) => {
      const nextPaths = new Set(previousPaths)

      if (nextPaths.has(folderPath)) {
        nextPaths.delete(folderPath)
      } else {
        nextPaths.add(folderPath)
      }

      // Unchecking the last folder leaves no "Cancel" button to escape with, so
      // drop out of multi-select automatically once nothing's selected.
      if (nextPaths.size === 0) {
        setIsMultiSelectMode(false)
      }

      return nextPaths
    })
  }, [])

  const clearMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false)

    setSelectedFolderPaths(initialSelectedFolderPaths)
  }, [])

  const onSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  // Escape clears the query while the box is focused (the global browser
  // keyboard bails on a focused input, so it can't do this for us).
  const onSearchKeyDown = useCallback((event) => {
    if (event.code === "Escape") {
      setSearchQuery("")
    }
  }, [])

  const openSelectedFolders = useCallback(() => {
    const foldersToOpen = displayedDirectories.filter(
      ({ path }) => selectedFolderPaths.has(path),
    )

    addFoldersToQueue(foldersToOpen)

    // "Open N folders" should both queue the tabs *and* drop into the
    // side-by-side viewer showing the first one, rather than leaving the user
    // in the file browser. Open the first selected folder into a fresh column.
    const [firstFolder] = foldersToOpen

    if (firstFolder) {
      const pane = addPane()

      assignFolderPathToPane(pane.id, {
        name: firstFolder.name,
        path: firstFolder.path,
      })
    }

    clearMultiSelect()
  }, [
    addFoldersToQueue,
    addPane,
    assignFolderPathToPane,
    clearMultiSelect,
    displayedDirectories,
    selectedFolderPaths,
  ])

  const deleteFileOrFolder = useCallback(() => {
    const numberOfDirectories = directories.length

    const isDirectory = selectedIndex < numberOfDirectories

    window.api
      .deleteFilePath({
        filePath: isDirectory
          ? directories[selectedIndex].path
          : imageFiles[selectedIndex - numberOfDirectories]
              .path,
        isDirectory,
      })
      .then(() => {
        setFilePath("")
      })
      .then(() => {
        setFilePath(filePath)
      })
      .then(closeDeleteFileModal)
  }, [
    closeDeleteFileModal,
    directories,
    filePath,
    imageFiles,
    selectedIndex,
    setFilePath,
  ])

  // This folder pane holds every image it lists, so a path stays cached while
  // the folder is open and only becomes eligible for eviction once released.
  // With overlapping panes (side-by-side columns showing the same folder),
  // closing one pane decrements rather than nuking blobs the other still shows.
  //
  // Keyed on the *set* of paths (a sorted, newline-joined digest), not the
  // array identity: re-sorting via the Newest/Name toggle yields a new array of
  // the same paths, and releasing then re-retaining them mid-toggle would evict
  // the cached blobs (they wouldn't reload until you left and re-entered the
  // folder). Deriving the paths back from the digest keeps the effect from
  // re-running on a reorder, so only an actual folder change churns the cache.
  const retainedPathsKey = useMemo(
    () =>
      imageFiles
        .map(({ path }) => path)
        .sort()
        .join("\n"),
    [imageFiles],
  )

  useEffect(() => {
    const paths = retainedPathsKey
      ? retainedPathsKey.split("\n")
      : []

    paths.forEach((filePath) => {
      retainImage({ filePath })
    })

    return () => {
      paths.forEach((filePath) => {
        releaseImage({ filePath })
      })
    }
  }, [retainedPathsKey, releaseImage, retainImage])

  useEffect(
    () => () => {
      setPreviousFilePath(filePath)

      setPreviousImageFilePath(imageFilePath)
    },
    [filePath, imageFilePath],
  )

  const imageFilePathRef = useRef()

  imageFilePathRef.current = imageFilePath

  useLayoutEffect(() => {
    // Cannot listen directly to `imageFilePath` because this will
    // update twice when it should only update once.
    const nextSelectedIndex = imageFilePathRef.current
      ? imageFiles.findIndex(({ path }) =>
          Object.is(path, imageFilePathRef.current),
        )
      : previousImageFilePath
        ? imageFiles.findIndex(
            ({ path }) => path === previousImageFilePath,
          )
        : directories.findIndex(
            ({ path }) => path === previousFilePath,
          )

    setSelectedIndex(Math.max(0, nextSelectedIndex))
  }, [
    directories,
    imageFiles,
    previousFilePath,
    previousImageFilePath,
  ])

  useKeyboardControls((event) => {
    if (isDeleteFileModalVisible) {
      return
    }

    // The search box owns the keyboard while it's focused — otherwise Backspace,
    // Enter, arrows, etc. would navigate the browser instead of editing the
    // query. (Escape-to-clear is handled on the input itself, see `onSearchKeyDown`.)
    if (document.activeElement?.tagName === "INPUT") {
      return
    }

    // Search results are a flat cross-tree list shown by pointer; the flat
    // `selectedIndex` grid nav targets the current directory's own listing, so
    // it doesn't apply here. Keep only Escape, to leave the search.
    if (isSearching) {
      if (event.code === "Escape") {
        setSearchQuery("")
      }

      return
    }

    // Bail while the immersive viewer is up (legacy image or columns) — it owns
    // the keyboard then, and the gallery is only behind it.
    if (imageFilePath || panes.length > 0) {
      return
    }

    // Multi-select owns its own affordances (tap to toggle, action bar to
    // confirm); the single-selection keyboard nav would fight it, so no-op
    // here and let Escape back out.
    if (isMultiSelectMode) {
      if (event.code === "Escape") {
        clearMultiSelect()
      }

      return
    }

    // The grouped date view is pointer-driven: the flat `selectedIndex` grid
    // nav doesn't map onto the bucketed layout, so only keep "up a folder".
    if (isGroupedView) {
      if (
        event.code === "Backspace" ||
        event.code === "Escape"
      ) {
        navigateUpFolderTree()
      }

      return
    }

    const {
      code,
      ctrlKey: isCtrlKeyHeld,
      shiftKey: isShiftKeyHeld,
    } = event

    const keyCodeIndexValues = {
      ArrowDown: () => numberOfColumns,
      ArrowLeft: () => keyCodeIndexValues.ArrowRight() * -1,
      ArrowRight: () => 1,
      ArrowUp: () => keyCodeIndexValues.ArrowDown() * -1,
      PageDown: () => {
        const viewHeight =
          virtualizedListContainerRef.current.clientHeight

        const itemSize =
          virtualizedListContainerRef.current.clientWidth /
          numberOfColumns

        const rowsInView = Math.floor(viewHeight / itemSize)

        return rowsInView * numberOfColumns
      },
      PageUp: () => keyCodeIndexValues.PageDown() * -1,
    }

    if (code === "Delete") {
      openDeleteFileModal()
    } else if (code === "Backspace" || code === "Escape") {
      navigateUpFolderTree()
    } else if (code === "Enter") {
      const numberOfDirectories = directories.length

      if (isShiftKeyHeld) {
        window.api.createNewWindow({ filePath })
      } else if (isCtrlKeyHeld) {
        window.api.createNewWindow({
          filePath:
            selectedIndex < numberOfDirectories
              ? directories[selectedIndex].path
              : imageFiles[
                  selectedIndex - numberOfDirectories
                ].path,
        })
      } else if (selectedIndex < numberOfDirectories) {
        setFilePath(directories[selectedIndex].path)
      } else {
        setImageFile(
          imageFiles[selectedIndex - numberOfDirectories],
        )
      }
    } else if (code === "Home") {
      setSelectedIndex(0)
    } else if (code === "End") {
      setSelectedIndex(
        directories.length + imageFiles.length - 1,
      )
    } else if (keyCodeIndexValues[code]) {
      setSelectedIndex(
        Math.min(
          directories.concat(imageFiles).length - 1,
          Math.max(
            0,
            selectedIndex + keyCodeIndexValues[code](),
          ),
        ),
      )
    }
  })

  useLayoutEffect(() => {
    const calculateNumberOfColumns = () => {
      const viewWidth =
        virtualizedListContainerRef.current.clientWidth

      const nextNumberOfColumns = Math.floor(
        viewWidth / 300,
      )

      setNumberOfColumns(Math.max(1, nextNumberOfColumns))
    }

    const throttleColumnCountCalculation = () => {
      if (animationFrameIdRef.current) {
        return
      }

      animationFrameIdRef.current =
        window.requestAnimationFrame(() => {
          animationFrameIdRef.current = null

          calculateNumberOfColumns()
        })
    }

    const resizeObserver = new ResizeObserver(
      throttleColumnCountCalculation,
    )

    resizeObserver.observe(
      virtualizedListContainerRef.current,
    )

    return () => {
      window.cancelAnimationFrame(
        animationFrameIdRef.current,
      )

      animationFrameIdRef.current = null

      resizeObserver.disconnect()
    }
  }, [])

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

  const selectedCount = selectedFolderPaths.size

  return (
    <MultiSelectContext.Provider
      value={multiSelectProviderValue}
    >
      <div css={fileBrowserStyles}>
        <DirectoryControls />

        <FolderTabStrip />

        <div css={searchBarStyles}>
          <input
            css={searchInputStyles}
            onChange={onSearchChange}
            onKeyDown={onSearchKeyDown}
            placeholder="Search folders in this directory and its subfolders…"
            type="text"
            value={searchQuery}
          />

          {isSearching && isSearchPending && (
            <span css={searchPendingStyles}>
              Searching subfolders…
            </span>
          )}

          {isSearching && (
            <button
              aria-label="Clear search"
              css={searchClearButtonStyles}
              onClick={clearSearch}
              title="Clear search"
              type="button"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        <div
          css={virtualizedListContainerStyles}
          ref={virtualizedListContainerRef}
        >
          {isLoading ? (
            <div css={loadingStyles} />
          ) : isSearching &&
            isSearchPending &&
            displayedDirectories.length === 0 ? (
            <div css={searchStatusStyles}>Searching…</div>
          ) : isSearching &&
            displayedDirectories.length === 0 ? (
            <div css={searchStatusStyles}>
              No folders match “{trimmedQuery}”.
            </div>
          ) : isGroupedView ? (
            <DateGroupedGrid
              groups={dateGroups}
              itemPadding="2px"
              numberOfColumns={numberOfColumns}
              renderItem={renderGroupedEntry}
            />
          ) : (
            <VirtualizedList
              itemPadding="2px"
              numberOfColumns={numberOfColumns}
              selectedIndex={
                isSearching ? -1 : selectedIndex
              }
            >
              {displayedDirectories.map(
                ({ name, path }) => (
                  <Directory
                    directoryName={name}
                    directoryPath={path}
                    key={path}
                  />
                ),
              )}

              {displayedImageFiles.map(({ name, path }) => (
                <ImageFile
                  fileName={name}
                  filePath={path}
                  key={path}
                />
              ))}
            </VirtualizedList>
          )}
        </div>

        <DeleteFileModal
          isVisible={isDeleteFileModalVisible}
          onClose={closeDeleteFileModal}
          onConfirm={deleteFileOrFolder}
        />
      </div>

      {isMultiSelectMode && selectedCount > 0 && (
        <div css={multiSelectActionBarStyles}>
          <Button
            onClick={openSelectedFolders}
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
    </MultiSelectContext.Provider>
  )
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
