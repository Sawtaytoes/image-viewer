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

const propTypes = {
  fileName: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
}

// An image tile in the in-pane gallery. Tapping jumps the column straight to
// that image (`onOpen`) and closes the gallery.
const PaneGalleryImageTile = ({
  fileName,
  filePath,
  onOpen,
}) => {
  const onClick = useCallback(() => {
    onOpen(filePath)
  }, [filePath, onOpen])

  return (
    <div css={imageTileStyles} onClick={onClick}>
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
