import { memo, useCallback } from "react"

import PaneThumbnail from "./PaneThumbnail"

// The image the owning column is currently showing, called out so the gallery
// reads as "you're here" — an inset ring (not a border) so it doesn't shift the
// tile or eat into the thumbnail.
const CURRENT_TILE_CLASSES =
  "shadow-[inset_0_0_0_3px_var(--color-intent-accent-solid)]"

// A real `<button>`, so a tile is in the accessibility tree with a role and
// Enter or Space on it does what a tap does. `block` undoes the button's
// inline-block; Tailwind's preflight resets the rest.
const TILE_CLASSES =
  "relative block w-full cursor-pointer pb-[100%]"

import NewEntryIndicator from "../fileBrowser/NewEntryIndicator"

interface PaneGalleryImageTileProps {
  fileName: string
  filePath: string
  // True for the tile matching the column's currently-loaded image.
  isCurrent?: boolean
  isNew?: boolean
  onOpen: (filePath: string) => void
}

// An image tile in the in-pane gallery. Tapping jumps the column straight to
// that image (`onOpen`) and closes the gallery.
const PaneGalleryImageTile = ({
  fileName,
  filePath,
  isCurrent = false,
  isNew = false,
  onOpen,
}: PaneGalleryImageTileProps) => {
  const onClick = useCallback(() => {
    onOpen(filePath)
  }, [filePath, onOpen])

  return (
    <button
      aria-current={isCurrent ? "true" : undefined}
      className={
        isCurrent
          ? `${TILE_CLASSES} ${CURRENT_TILE_CLASSES}`
          : TILE_CLASSES
      }
      data-tap-surface
      onClick={onClick}
      type="button"
    >
      <PaneThumbnail
        fileName={fileName}
        filePath={filePath}
      />
      {isNew && <NewEntryIndicator />}
    </button>
  )
}

const MemoizedPaneGalleryImageTile = memo(
  PaneGalleryImageTile,
)

export default MemoizedPaneGalleryImageTile
