import {
  Button,
  Field,
  IconButton,
  Toast,
  Tooltip,
  VisuallyHidden,
} from "@charcuterie/ui"
import {
  type ChangeEventHandler,
  type KeyboardEventHandler,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type {
  FolderMatch,
  ImageFile as ImageFileEntry,
} from "../../types"
import FullScreenContext from "../convenience/FullScreenContext"
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
import DeleteFileModal from "../toolkit/DeleteFileModal"
import FolderTabStrip from "../workspace/FolderTabStrip"
import WorkspaceContext from "../workspace/WorkspaceContext"
import DateGroupedGrid, {
  type DateGroupedEntry,
} from "./DateGroupedGrid"
import Directory from "./Directory"
import DirectoryControls from "./DirectoryControls"
import groupEntriesByDate from "./dateGroups"
import FileSystemContext from "./FileSystemContext"
import ImageFile from "./ImageFile"
import MultiSelectContext, {
  type MultiSelectContextValue,
} from "./MultiSelectContext"
import sortDirectoryEntries from "./sortDirectoryEntries"
import VirtualizedList from "./VirtualizedList"

// The title-bar strip is `--title-bar-height` in `src/styles/tailwind.css`, the
// same value `titleBarHeight.ts` and `main.js` carry — reading the custom
// property here is what lets the browser sit below the bar without an arbitrary
// pixel literal in the markup.
const fileBrowserClassName =
  "grid w-full grid-rows-[auto_auto_auto_1fr] bg-surface-base text-content-primary"

const insetFileBrowserClassName = `${fileBrowserClassName} mt-(--title-bar-height) h-[calc(100vh-var(--title-bar-height))]`

// Fullscreen auto-hides the title bar, so the browser reclaims that top strip.
// The bar reveals as an overlay above it rather than pushing this down.
const fullBleedFileBrowserClassName = `${fileBrowserClassName} mt-0 h-screen`

// `Toast` renders an `<li>` — it is built to sit in `ToastRegion`'s `<ul>`, and
// this bar supplies its own instead. Not `ToastRegion` itself: that component
// takes `ToastRecord`s, which carry a `description` and nothing that could hold
// the "Open N folders" control, so the region can render a notification and not
// an action bar.
const multiSelectBarClassName =
  "fixed bottom-6 left-1/2 z-[9999] m-0 flex w-auto max-w-[90%] -translate-x-1/2 list-none flex-col p-0"

// Reused as both the initial value and the cleared value — toggling always
// builds a fresh Set, so this is never mutated.
const initialSelectedFolderPaths: ReadonlySet<string> =
  new Set()

const initialSubfolderResults: FolderMatch[] = []

const FileBrowser = () => {
  const animationFrameIdRef = useRef<number | null>(null)
  const virtualizedListContainerRef =
    useRef<HTMLDivElement>(null)

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

  const [subfolderResults, setSubfolderResults] = useState<
    FolderMatch[]
  >(initialSubfolderResults)

  const [isSearchPending, setIsSearchPending] =
    useState(false)

  const [previousFilePath, setPreviousFilePath] =
    useState("")

  const [previousImageFilePath, setPreviousImageFilePath] =
    useState("")

  const [selectedFolderPaths, setSelectedFolderPaths] =
    useState<ReadonlySet<string>>(
      initialSelectedFolderPaths,
    )

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

  const { isFullScreen } = useContext(FullScreenContext)

  // The viewer is a fixed overlay that fully covers this browser when open, so
  // its directory controls and tab strip are dead weight underneath — and the
  // tab strip would be a SECOND live `FolderTabStrip` beside the one the viewer
  // chrome renders. Drop them while the viewer is open so exactly one of each is
  // mounted. Same open test `ImageViewer` uses.
  const isViewerOpen =
    Boolean(imageFilePath) || panes.length > 0

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

      setSubfolderResults(initialSubfolderResults)
    }
  }, [filePath])

  // Phase 2 — debounced disk walk for the deeper matches, streamed in as each
  // directory level is scanned (via `onBatch`) so hits appear progressively
  // rather than all at the end. Each keystroke restarts the timer, and an
  // `isCancelled` flag drops any in-flight batch/result whose query has moved on.
  useEffect(() => {
    if (!isSearching) {
      setSubfolderResults(initialSubfolderResults)

      setIsSearchPending(false)

      return undefined
    }

    let isCancelled = false

    setSubfolderResults(initialSubfolderResults)

    setIsSearchPending(true)

    const timeoutId = window.setTimeout(() => {
      const onBatch = (matches: FolderMatch[]) => {
        if (isCancelled) {
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
          if (isCancelled) {
            return
          }

          // Settle on the authoritative full list (covers the fake FS, which
          // resolves at once without streaming).
          setSubfolderResults(folders)

          setIsSearchPending(false)
        })
        .catch(() => {
          if (isCancelled) {
            return
          }

          setIsSearchPending(false)
        })
    }, 250)

    return () => {
      isCancelled = true

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

    const seenPaths = new Set<string>()
    const merged: ImageFileEntry[] = []

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

    // The explicit type argument on `map` is what keeps `kind` a literal:
    // without it the callback infers `string` and the entry stops being the
    // discriminated union `renderGroupedEntry` switches on.
    const combinedEntries = sortDirectoryEntries(
      [
        ...directories.map<DateGroupedEntry>(
          (directory) => ({
            ...directory,
            kind: "directory",
          }),
        ),
        ...imageFiles.map<DateGroupedEntry>(
          (imageFile) => ({
            ...imageFile,
            kind: "image",
          }),
        ),
      ],
      sortOrders.modifiedDesc,
    )

    return groupEntriesByDate(combinedEntries)
  }, [directories, imageFiles, isGroupedView])

  const renderGroupedEntry = useCallback(
    (entry: DateGroupedEntry): ReactNode =>
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

  const toggleFolder = useCallback((folderPath: string) => {
    setSelectedFolderPaths((previousPaths) => {
      const nextPaths = new Set(previousPaths)

      if (nextPaths.has(folderPath)) {
        nextPaths.delete(folderPath)
      } else {
        nextPaths.add(folderPath)
      }

      // Unchecking the last folder leaves no "Cancel" button to escape with,
      // so drop out of multi-select automatically once nothing's selected.
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

  const onSearchChange = useCallback<
    ChangeEventHandler<HTMLInputElement>
  >((event) => {
    setSearchQuery(event.target.value)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
  }, [])

  // Escape clears the query while the box is focused (the global browser
  // keyboard bails on a focused input, so it can't do this for us).
  const onSearchKeyDown = useCallback<
    KeyboardEventHandler<HTMLInputElement>
  >((event) => {
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

    paths.forEach((retainedFilePath) => {
      retainImage({ filePath: retainedFilePath })
    })

    return () => {
      paths.forEach((retainedFilePath) => {
        releaseImage({ filePath: retainedFilePath })
      })
    }
  }, [retainedPathsKey, releaseImage, retainImage])

  useEffect(
    () => () => {
      setPreviousFilePath(filePath)

      // `imageFilePath` is `undefined` whenever no single image is open; both
      // that and "" are falsy to the index lookup below, so normalising here
      // keeps this state a plain string.
      setPreviousImageFilePath(imageFilePath ?? "")
    },
    [filePath, imageFilePath],
  )

  const imageFilePathRef = useRef<string | undefined>(
    undefined,
  )

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

    const keyCodeIndexValues: Record<string, () => number> =
      {
        ArrowDown: () => numberOfColumns,
        ArrowLeft: () =>
          keyCodeIndexValues.ArrowRight() * -1,
        ArrowRight: () => 1,
        ArrowUp: () => keyCodeIndexValues.ArrowDown() * -1,
        PageDown: () => {
          const container =
            virtualizedListContainerRef.current

          if (!container) {
            return 0
          }

          const viewHeight = container.clientHeight

          const itemSize =
            container.clientWidth / numberOfColumns

          const rowsInView = Math.floor(
            viewHeight / itemSize,
          )

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
    const container = virtualizedListContainerRef.current

    if (!container) {
      return undefined
    }

    const calculateNumberOfColumns = () => {
      const viewWidth = container.clientWidth

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

    resizeObserver.observe(container)

    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameIdRef.current,
        )
      }

      animationFrameIdRef.current = null

      resizeObserver.disconnect()
    }
  }, [])

  const multiSelectProviderValue =
    useMemo<MultiSelectContextValue>(
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
      <div
        className={
          isFullScreen
            ? fullBleedFileBrowserClassName
            : insetFileBrowserClassName
        }
      >
        {!isViewerOpen && <DirectoryControls />}

        {!isViewerOpen && <FolderTabStrip />}

        {/* Explicit rows (not auto-placement): FolderTabStrip renders null when
            the queue is empty, so pinning the search bar and list to fixed rows
            keeps them put whether or not the tab strip is there. `relative`
            anchors the indeterminate progress line to the bar's bottom edge. */}
        <div className="relative row-start-3 flex items-center gap-2 bg-surface-raised px-2 py-1.5">
          {/* `Field` owns the control's id and renders the real `<label for>`
              that names it. Before this, the box had no accessible name at all
              — only a `placeholder`, which is announced as a *value* hint and
              disappears the moment anything is typed. The label is
              `VisuallyHidden` rather than absent because a visible one above a
              full-width search bar costs a row of a touch-first layout, and a
              hidden `<label>` names a control exactly as well as a shown one.

              The "Searching subfolders…" hint stays a sibling rather than
              moving into `Field`'s `description` slot: a description renders
              *under* the input, so it would grow the bar every time a walk
              started, and this row is deliberately built so nothing appearing
              in it nudges the layout (see the progress line below). */}
          <Field
            className="min-w-0 flex-auto"
            label={
              <VisuallyHidden>
                Search folders in this directory and its
                subfolders
              </VisuallyHidden>
            }
          >
            <input
              className="w-full rounded-[5px] border-0 bg-surface-sunken px-3 py-2 text-md text-content-primary placeholder:text-content-muted focus:outline-2 focus:outline-intent-accent-solid"
              onChange={onSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="Search folders in this directory and its subfolders…"
              type="text"
              value={searchQuery}
            />
          </Field>

          {isSearching && isSearchPending && (
            // Inline "still walking the tree" hint — the instant current-
            // directory matches already show, so this just signals more may
            // stream in.
            <span className="flex-none whitespace-nowrap text-sm text-content-muted">
              Searching subfolders…
            </span>
          )}

          {isSearching && (
            // The `title` attribute is gone fleet-wide in this phase: it is
            // unreachable by touch, unreachable by keyboard, and cannot be
            // styled. `Tooltip` opens on hover AND focus, closes on Escape, and
            // points `aria-describedby` at itself.
            <Tooltip label="Clear search">
              <IconButton
                className="flex-none rounded-full border-transparent"
                label="Clear search"
                appearance="ghost"
                intent="neutral"
                onClick={clearSearch}
                size="sm"
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          )}

          {isSearching && isSearchPending && (
            // Indeterminate progress line pinned under the search bar while the
            // subfolder walk runs. Indeterminate rather than a percentage: the
            // tree's size isn't known until it's been walked, so there's no
            // honest total to divide by. Absolutely positioned so showing/hiding
            // it never nudges the layout. The travelling segment is 25% wide, so
            // it slides from fully off-left to fully off-right.
            <div className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden bg-intent-neutral-surface-hover after:block after:h-full after:w-1/4 after:animate-indeterminate-slide after:bg-intent-accent-solid after:content-['']" />
          )}
        </div>

        <div
          className="row-start-4 overflow-hidden"
          ref={virtualizedListContainerRef}
        >
          {isLoading ? (
            // Centered spinner shown while a folder's listing is still being
            // read, so a large folder (especially one sorted by date, which
            // stats every file) reads as "loading" rather than a blank window.
            <div className="flex h-full w-full items-center justify-center after:h-9 after:w-9 after:animate-spinner after:rounded-full after:border-4 after:border-border-default after:border-t-content-primary after:content-['']" />
          ) : isSearching &&
            isSearchPending &&
            displayedDirectories.length === 0 ? (
            // Shown in place of the folder grid while a search is running or has
            // no hits, so an empty result set reads as a state rather than a
            // blank window.
            <div className="p-5 text-lg text-content-muted">
              Searching…
            </div>
          ) : isSearching &&
            displayedDirectories.length === 0 ? (
            <div className="p-5 text-lg text-content-muted">
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
        <ul className={multiSelectBarClassName}>
          <Toast
            // `0` disables the auto-dismiss timer. Everything else `Toast` does
            // is what this bar hand-rolled — bottom-centred, elevated, an enter
            // transition (`animate-action-bar-in`, now the component's own) —
            // but a selection is not a notification with a deadline, and a bar
            // that vanished after five seconds mid-selection would be a bug.
            duration={0}
            intent="accent"
            // The ✕ **is** Cancel. Keeping a separate "Cancel" button beside a
            // dismiss control that does the identical thing is two affordances
            // for one action; `data-density="kiosk"` (this same phase) sizes the
            // ✕ to the 44px touch target the old button was reaching for by
            // hand.
            onRemove={clearMultiSelect}
            title={`${selectedCount} folders selected`}
          >
            <Button
              iconStart={<PlayArrowIcon />}
              intent="success"
              onClick={openSelectedFolders}
              size="lg"
            >
              Open {selectedCount} folders
            </Button>
          </Toast>
        </ul>
      )}
    </MultiSelectContext.Provider>
  )
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
