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

// The image the owning column is currently showing, called out so the gallery
// reads as "you're here" — an inset ring (not a border) so it doesn't shift the
// tile or eat into the thumbnail.
const currentImageTileStyles = css`
	box-shadow: inset 0 0 0 3px #2a6f97;
`

const propTypes = {
  fileName: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  // True for the tile matching the column's currently-loaded image.
  isCurrent: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
}

// An image tile in the in-pane gallery. Tapping jumps the column straight to
// that image (`onOpen`) and closes the gallery.
const PaneGalleryImageTile = ({
  fileName,
  filePath,
  isCurrent = false,
  onOpen,
}) => {
  const onClick = useCallback(() => {
    onOpen(filePath)
  }, [filePath, onOpen])

  return (
    <div
      css={
        isCurrent
          ? [imageTileStyles, currentImageTileStyles]
          : imageTileStyles
      }
      onClick={onClick}
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
