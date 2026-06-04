import { css } from "@emotion/react"
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

import useKeyboardControls from "../convenience/useKeyboardControls"
import PlayArrowIcon from "../icons/PlayArrowIcon"
import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import ImageViewerContext from "../imageViewer/ImageViewerContext"
import SettingsContext from "../settings/SettingsContext"
import { sortOrders } from "../settings/sortOrders"
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
	height: 100vh;
	width: 100%;
	grid-template-rows: auto auto 1fr;
`

const virtualizedListContainerStyles = css`
	grid-row: 3;
	overflow: hidden;
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

  const { sortOrder } = useContext(SettingsContext)

  // Group into Explorer-style date buckets only when sorting by date and
  // actually inside a folder — the drive list at the root has no useful dates.
  const isGroupedView =
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

      return nextPaths
    })
  }, [])

  const clearMultiSelect = useCallback(() => {
    setIsMultiSelectMode(false)

    setSelectedFolderPaths(initialSelectedFolderPaths)
  }, [])

  const openSelectedFolders = useCallback(() => {
    const foldersToOpen = directories.filter(({ path }) =>
      selectedFolderPaths.has(path),
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
    directories,
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
  useEffect(() => {
    imageFiles.forEach(({ path }) => {
      retainImage({ filePath: path })
    })

    return () => {
      imageFiles.forEach(({ path }) => {
        releaseImage({ filePath: path })
      })
    }
  }, [imageFiles, releaseImage, retainImage])

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

        <div
          css={virtualizedListContainerStyles}
          ref={virtualizedListContainerRef}
        >
          {isGroupedView ? (
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
              selectedIndex={selectedIndex}
            >
              {directories.map(({ name, path }) => (
                <Directory
                  directoryName={name}
                  directoryPath={path}
                  key={path}
                />
              ))}

              {imageFiles.map(({ name, path }) => (
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
