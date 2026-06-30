import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useCallback } from "react"

import PaneThumbnail from "./PaneThumbnail"

const imageTileStyles = css`
	cursor: pointer;
	padding-bottom: 100%;
	position: relative;
	width: 100%;
`

// The image the gallery opens pre-selected (the *next* image in the cull-forward
// flow), called out so the gallery reads as "this is up next" — an inset ring
// (not a border) so it doesn't shift the tile or eat into the thumbnail.
const selectedImageTileStyles = css`
	box-shadow: inset 0 0 0 3px #2a6f97;
`

const propTypes = {
  fileName: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  // True for the tile the gallery opens with selected (the next image).
  isSelected: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  // Attached to the selected tile so the gallery can scroll it into view on
  // mount; omitted (and so unset) for every other tile.
  tileRef: PropTypes.shape({ current: PropTypes.any }),
}

// An image tile in the in-pane gallery. Tapping jumps the column straight to
// that image (`onOpen`) and closes the gallery.
const PaneGalleryImageTile = ({
  fileName,
  filePath,
  isSelected = false,
  onOpen,
  tileRef,
}) => {
  const onClick = useCallback(() => {
    onOpen(filePath)
  }, [filePath, onOpen])

  return (
    <div
      css={
        isSelected
          ? [imageTileStyles, selectedImageTileStyles]
          : imageTileStyles
      }
      onClick={onClick}
      ref={tileRef}
    >
      <PaneThumbnail
        fileName={fileName}
        filePath={filePath}
      />
    </div>
  )
}

PaneGalleryImageTile.propTypes = propTypes

const MemoizedPaneGalleryImageTile = memo(
  PaneGalleryImageTile,
)

export default MemoizedPaneGalleryImageTile
