import {
  Button,
  IconButton,
  Select,
  Toast,
  Tooltip,
} from "@charcuterie/ui"
import {
  Fragment,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { ImageFile } from "../../types"
import type { DateGroup } from "../fileBrowser/dateGroups"
import groupEntriesByDate from "../fileBrowser/dateGroups"
import type { MultiSelectContextValue } from "../fileBrowser/MultiSelectContext"
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
  isSortOrder,
  sortOrderOptions,
  sortOrders,
} from "../settings/sortOrders"
import WorkspaceContext from "../workspace/WorkspaceContext"
import PaneGalleryFolderTile from "./PaneGalleryFolderTile"
import PaneGalleryImageTile from "./PaneGalleryImageTile"

const pathApi = window.api.path

// Sort-order picker: the shared `Select` beside the sort glyph, mirroring the
// file browser's DirectoryControls so the gallery sorts the same folder the
// same way. `Select`'s own root is `w-full`, so the width lives on this wrapper
// rather than in the `className` it forwards (that lands on the `<select>`).
const SORT_PICKER_CLASSES =
  "flex w-[132px] flex-none items-center gap-1"

// Thumbnails are sized by a fixed minimum track, not a fraction of the pane, so
// each tile stays the same physical size whether the gallery fills the window or
// shares it with several panes — a narrower pane shows fewer columns rather than
// shrinking every tile. Keeping tiles large also bounds how many decode at once,
// which is what made many-pane layouts crawl.
const GRID_CLASSES =
  "grid flex-auto content-start grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-0.5 overflow-y-auto p-0.5"

// Full-width date-bucket heading spanning every grid column. The
// `:not(:first-of-type)` rule has no utility of its own, so it is an arbitrary
// variant rather than three more class names on the caller.
const GROUP_HEADER_CLASSES =
  "col-span-full flex items-end px-1.5 pt-2.5 pb-1 text-[15px] font-semibold text-content-secondary [&:not(:first-of-type)]:mt-1 [&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-border-strong"

// Centered spinner shown while a folder's listing is still being read, so
// climbing into a slow directory reads as "loading" rather than "stuck". The
// ring is an `::after`, which no inline style can reach — hence the custom
// `animate-spinner` (700ms) instead of Tailwind's 1s `animate-spin`.
const LOADING_CLASSES =
  "flex flex-auto items-center justify-center p-6 after:h-[28px] after:w-[28px] after:animate-spinner after:rounded-full after:border-[3px] after:border-content-disabled after:border-t-content-primary after:content-['']"

// `Toast` renders an `<li>`; this is the `<ul>` it needs, positioned where the
// hand-rolled bar was. See `FileBrowser` for why it is not `ToastRegion`.
const MULTI_SELECT_BAR_CLASSES =
  "absolute bottom-4 left-1/2 z-[2] m-0 flex w-auto max-w-[90%] -translate-x-1/2 list-none flex-col p-0"

// A directory or an image, tagged with which it is. The grouped view interleaves
// the two listings by mtime, so once they are in one array the tag is the only
// thing left that says which tile to render.
type GalleryEntryKind = "directory" | "image"

interface GalleryEntry extends ImageFile {
  kind: GalleryEntryKind
}

// Reused as both the initial value and the cleared value — toggling always
// builds a fresh Set, so this is never mutated.
const initialSelectedFolderPaths = new Set<string>()

interface PaneGalleryProps {
  // Path of the image the owning column is currently showing, so the tile for
  // it can be outlined while browsing the folder it lives in. Null when the
  // column has no image loaded.
  currentImagePath?: string | null
  // Where to start browsing (the column's current folder, or a drive root).
  folderPath: string
  onClose: () => void
  // (folderPath, imageIndex) — the folder being browsed and the tapped image's
  // index within that folder's listing.
  onOpenImage: (
    folderPath: string,
    imageIndex: number,
  ) => void
}

// The regular gallery, rendered inside a single column instead of a full-screen
// overlay. Browse folders (tap to drill in, up-button to climb), tap an image
// to jump the column to it, or long-press folders to queue several at once.
const PaneGallery = ({
  currentImagePath,
  folderPath,
  onClose,
  onOpenImage,
}: PaneGalleryProps) => {
  const [browsePath, setBrowsePath] = useState(folderPath)

  const [isMultiSelectMode, setIsMultiSelectMode] =
    useState(false)

  const [selectedFolderPaths, setSelectedFolderPaths] =
    useState(initialSelectedFolderPaths)

  const { addFoldersToQueue } = useContext(WorkspaceContext)

  const { setSortOrder, sortOrdersByFolder } =
    useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    browsePath,
  )

  // `Select` hands back the raw `value` string, and `isSortOrder` is the type
  // predicate that turns it back into a `SortOrder` without a cast. The guard
  // is not ceremony: the `<option>`s come from this app, but the DOM is where
  // the value lives and the narrowing has to happen somewhere real.
  const changeFolderSortOrder = useCallback(
    (nextSortOrder: string) => {
      if (isSortOrder(nextSortOrder)) {
        setSortOrder(browsePath, nextSortOrder)
      }
    },
    [browsePath, setSortOrder],
  )

  const { directories, imageFiles, isLoading } =
    useFolderListing(browsePath)

  const isGroupedView =
    sortOrder === sortOrders.modifiedDesc

  // Folders + images interleaved newest-first and split into date buckets,
  // mirroring the home gallery's grouped view (built only when grouping).
  const dateGroups = useMemo<
    DateGroup<GalleryEntry>[]
  >(() => {
    if (!isGroupedView) {
      return []
    }

    // Annotated rather than tagged with a const assertion: the contextual type
    // is what keeps `kind` at the two-value union instead of widening it to
    // `string`, and it does it without an `as`.
    const directoryEntries: GalleryEntry[] =
      directories.map((directory) => ({
        ...directory,
        kind: "directory",
      }))

    const imageEntries: GalleryEntry[] = imageFiles.map(
      (imageFile) => ({
        ...imageFile,
        kind: "image",
      }),
    )

    const combinedEntries = sortDirectoryEntries(
      [...directoryEntries, ...imageEntries],
      sortOrders.modifiedDesc,
    )

    return groupEntriesByDate(combinedEntries)
  }, [directories, imageFiles, isGroupedView])

  const parentPath = pathApi.dirname(browsePath)
  const hasParentFolder =
    Boolean(parentPath) && parentPath !== browsePath

  const enterMultiSelect = useCallback(() => {
    setIsMultiSelectMode(true)
  }, [])

  const toggleFolder = useCallback((targetPath: string) => {
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
  const openFolder = useCallback((targetPath: string) => {
    setBrowsePath(targetPath)
  }, [])

  // A selection is scoped to the folder it started in: `queueSelectedFolders`
  // only queues paths still in the current `directories`, so a selection
  // carried up into another folder would silently drop. Reset it on navigation
  // rather than stranding stale checkmarks. (Queue more by selecting, opening,
  // then climbing and selecting again — the queue dedupes and appends.)
  const goUp = useCallback(() => {
    if (hasParentFolder) {
      clearMultiSelect()

      setBrowsePath(parentPath)
    }
  }, [clearMultiSelect, hasParentFolder, parentPath])

  const openImage = useCallback(
    (filePath: string) => {
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape") {
        return
      }

      if (isMultiSelectMode) {
        clearMultiSelect()
      } else if (hasParentFolder) {
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
    clearMultiSelect,
    hasParentFolder,
    isMultiSelectMode,
    onClose,
    parentPath,
  ])

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

  const title = pathApi.basename(browsePath) || browsePath

  const selectedCount = selectedFolderPaths.size

  const isEmpty =
    directories.length === 0 && imageFiles.length === 0

  return (
    <MultiSelectContext.Provider
      value={multiSelectProviderValue}
    >
      <div
        className="absolute inset-0 flex h-full w-full animate-fade-in flex-col bg-surface-base text-content-primary"
        data-viewer-overlay
      >
        <div className="flex flex-none items-center gap-1 bg-surface-sunken px-2 py-1.5">
          <Tooltip label="Go up a directory">
            <IconButton
              appearance="ghost"
              intent="neutral"
              isDisabled={!hasParentFolder}
              label="Go up a directory"
              onClick={goUp}
              size="sm"
            >
              <ArrowUpwardIcon />
            </IconButton>
          </Tooltip>

          <span className="min-w-0 flex-auto overflow-hidden font-semibold text-ellipsis whitespace-nowrap">
            {title}
          </span>

          {/* Was a click-to-cycle `<button>` whose only statement of its own
              state was the word on its face — nothing announced "Name, 1 of 2",
              and the two orders were reachable only by pressing until the label
              changed. It is a real `<select>` now.

              `key` re-seeds it, and it has to: `Select` is uncontrolled by
              design (the platform owns a `<select>`'s value), while the sort
              order here is stored *per folder path* — so drilling into a folder
              with a different order is a second writer, and without the key the
              control would keep showing the previous folder's choice with a
              green typecheck. */}
          <div className={SORT_PICKER_CLASSES}>
            <SortIcon />

            <Select
              key={browsePath}
              label="Sort order"
              onChange={changeFolderSortOrder}
              options={sortOrderOptions}
              size="sm"
              value={sortOrder}
            />
          </div>

          <Tooltip label="Close gallery">
            <IconButton
              appearance="ghost"
              intent="neutral"
              label="Close gallery"
              onClick={onClose}
              size="sm"
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </div>

        {isLoading ? (
          <div className={LOADING_CLASSES} />
        ) : isEmpty ? (
          <div className="p-6 text-center font-light text-content-muted">
            This folder is empty.
          </div>
        ) : (
          <div className={GRID_CLASSES}>
            {isGroupedView ? (
              dateGroups.map((group) => (
                <Fragment key={group.key}>
                  <div className={GROUP_HEADER_CLASSES}>
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
                        isCurrent={
                          entry.path === currentImagePath
                        }
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
                    isCurrent={path === currentImagePath}
                    key={path}
                    onOpen={openImage}
                  />
                ))}
              </Fragment>
            )}
          </div>
        )}

        {isMultiSelectMode && selectedCount > 0 && (
          <ul className={MULTI_SELECT_BAR_CLASSES}>
            <Toast
              duration={0}
              intent="accent"
              onRemove={clearMultiSelect}
              title={`${selectedCount} folders selected`}
            >
              <Button
                iconStart={<PlayArrowIcon />}
                intent="success"
                onClick={queueSelectedFolders}
                size="lg"
              >
                Open {selectedCount} folders
              </Button>
            </Toast>
          </ul>
        )}
      </div>
    </MultiSelectContext.Provider>
  )
}

const MemoizedPaneGallery = memo(PaneGallery)

export default MemoizedPaneGallery
