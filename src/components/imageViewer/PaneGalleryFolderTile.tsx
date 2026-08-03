import {
  memo,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import FillRing from "../fileBrowser/FillRing"
import MultiSelectContext from "../fileBrowser/MultiSelectContext"
import useFolderThumbnail from "../fileBrowser/useFolderThumbnail"
import useInView from "../fileBrowser/useInView"
import PaneThumbnail from "./PaneThumbnail"
import useLongPress from "./useLongPress"

// `touch-pan-y` keeps the grid scrollable on touch — `useLongPress` cancels
// itself on movement, so `touch-none` isn't needed to detect the hold.
//
// The background is deliberately NOT part of this string: the selected variant
// sets its own, and two `bg-*` utilities on one element resolve by stylesheet
// order rather than by the order they appear here. Same split, same tokens, as
// the home gallery's `fileBrowser/Directory` — this is that tile in a column.
const TILE_CLASSES =
  "relative w-full cursor-pointer touch-pan-y pb-[100%] font-light text-content-primary"

const UNSELECTED_TILE_CLASSES = `${TILE_CLASSES} bg-surface-raised`

const SELECTED_TILE_CLASSES = `${TILE_CLASSES} bg-intent-accent-solid outline-4 -outline-offset-4 outline-intent-accent-content`

interface PaneGalleryFolderTileProps {
  directoryName: string
  directoryPath: string
  onOpen: (directoryPath: string) => void
}

// A folder tile in the in-pane gallery. Tapping drills in (`onOpen`); a
// long-press bootstraps multi-select (same as the home gallery's `Directory`)
// so several folders can be queued at once.
const PaneGalleryFolderTile = ({
  directoryName,
  directoryPath,
  onOpen,
}: PaneGalleryFolderTileProps) => {
  const tileRef = useRef<HTMLDivElement>(null)
  // A completed hold is still followed by a `click`; swallow that one click so
  // it doesn't immediately toggle the selection back off.
  const suppressNextClickRef = useRef(false)

  const {
    enterMultiSelect,
    isMultiSelectMode,
    selectedFolderPaths,
    toggleFolder,
  } = useContext(MultiSelectContext)

  const [longPressProgress, setLongPressProgress] =
    useState(0)

  const isSelected = selectedFolderPaths.has(directoryPath)

  // Probe for a thumbnail only once the tile is in view. The probe also tells us
  // whether this is a "gallery" (holds images at any depth); only galleries can
  // be selected/queued — a folder of nothing but subfolders, or an image-less
  // container, can be browsed into but never added to the queue.
  const isInView = useInView(tileRef)

  const { image, isResolved } = useFolderThumbnail(
    directoryPath,
    isInView,
  )

  const isGallery = isResolved && Boolean(image)
  const isKnownNonGallery = isResolved && !image

  const onClick = useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false

      return
    }

    if (isMultiSelectMode) {
      // Tapping toggles, but only galleries take part in a selection. A
      // non-gallery folder is a no-op here — leave select mode to drill in.
      if (isGallery) {
        toggleFolder(directoryPath)
      }
    } else {
      onOpen(directoryPath)
    }
  }, [
    directoryPath,
    isGallery,
    isMultiSelectMode,
    onOpen,
    toggleFolder,
  ])

  const onLongPressProgress = useCallback(
    (fraction: number) => {
      // Don't tease the fill ring on a folder that can't be selected.
      setLongPressProgress(isKnownNonGallery ? 0 : fraction)
    },
    [isKnownNonGallery],
  )

  const onLongPressComplete = useCallback(() => {
    setLongPressProgress(0)

    // Only galleries are selectable; and once we're already in the mode the tap
    // handler toggles, so the hold only bootstraps it — don't double-toggle.
    if (!isGallery || isMultiSelectMode) {
      return
    }

    suppressNextClickRef.current = true

    enterMultiSelect()

    toggleFolder(directoryPath)
  }, [
    directoryPath,
    enterMultiSelect,
    isGallery,
    isMultiSelectMode,
    toggleFolder,
  ])

  const onLongPressCancel = useCallback(() => {
    setLongPressProgress(0)
  }, [])

  useLongPress({
    domElementRef: tileRef,
    onCancel: onLongPressCancel,
    onComplete: onLongPressComplete,
    onProgress: onLongPressProgress,
  })

  return (
    <div
      className={
        isSelected
          ? SELECTED_TILE_CLASSES
          : UNSELECTED_TILE_CLASSES
      }
      onClick={onClick}
      ref={tileRef}
    >
      <div className="absolute inset-0 flex flex-col px-2.5 py-1.5">
        <div className="overflow-hidden pb-1.5 text-ellipsis whitespace-nowrap">
          {directoryName}
        </div>

        {image && (
          <div className="relative flex-auto">
            <PaneThumbnail
              fileName={image.name}
              filePath={image.path}
            />
          </div>
        )}
      </div>

      {longPressProgress > 0 && (
        <FillRing progress={longPressProgress} />
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-intent-accent-content text-lg font-semibold text-intent-accent-surface">
          ✓
        </div>
      )}
    </div>
  )
}

const MemoizedPaneGalleryFolderTile = memo(
  PaneGalleryFolderTile,
)

export default MemoizedPaneGalleryFolderTile
