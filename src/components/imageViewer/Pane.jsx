import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useCallback, useContext } from "react"

import useFolderListing from "../fileBrowser/useFolderListing"
import WorkspaceContext from "../workspace/WorkspaceContext"
import EmptyPaneAffordance from "./EmptyPaneAffordance"
import ImageView from "./ImageView"
import usePaneNavigation from "./usePaneNavigation"
import useViewerKeyboard from "./useViewerKeyboard"

// `touch-action: none`: a pane isn't scrollable, so taps and the chrome
// summon-swipe must not be read as a browser pan/zoom.
const paneStyles = css`
	flex: 1 1 0;
	height: 100%;
	min-width: 0;
	position: relative;
	touch-action: none;
`

const propTypes = {
  isActive: PropTypes.bool.isRequired,
  pane: PropTypes.shape({
    currentIndex: PropTypes.number.isRequired,
    folderId: PropTypes.string,
    id: PropTypes.string.isRequired,
  }).isRequired,
  spawn: PropTypes.func.isRequired,
}

const Pane = ({ isActive, pane, spawn }) => {
  const {
    clearPanes,
    queuedFolders,
    removePane,
    setPaneIndex,
  } = useContext(WorkspaceContext)

  const folder = queuedFolders.find(
    ({ id }) => id === pane.folderId,
  )

  const { imageFiles } = useFolderListing(folder?.path)

  const setCurrentIndex = useCallback(
    (index) => {
      setPaneIndex(pane.id, index)
    },
    [pane.id, setPaneIndex],
  )

  // Clamp against the listing in case the folder changed under a stale index.
  const currentIndex = Math.min(
    pane.currentIndex,
    Math.max(0, imageFiles.length - 1),
  )

  const {
    goToNextImage,
    goToPreviousImage,
    isAtBeginning,
    isAtEnd,
  } = usePaneNavigation({
    currentIndex,
    imageFiles,
    setCurrentIndex,
  })

  // Center-tap closes this column (the feedback layer lives on ImageViewer, so
  // it finishes animating even as the pane unmounts).
  const closePane = useCallback(
    (point) => {
      if (point) {
        spawn({
          variant: "close",
          x: point.x,
          y: point.y,
        })
      }

      removePane(pane.id)
    },
    [pane.id, removePane, spawn],
  )

  // Only the active column owns the keyboard; Escape leaves the viewer.
  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled: isActive,
    onClose: clearPanes,
  })

  if (!folder) {
    return (
      <div css={paneStyles}>
        <EmptyPaneAffordance paneId={pane.id} />
      </div>
    )
  }

  const currentImage = imageFiles[currentIndex]

  return (
    <div css={paneStyles}>
      {currentImage && (
        <ImageView
          goToNextImage={goToNextImage}
          goToPreviousImage={goToPreviousImage}
          imageFileName={currentImage.name}
          imageFilePath={currentImage.path}
          isAtBeginning={isAtBeginning}
          isAtEnd={isAtEnd}
          onClose={closePane}
        />
      )}
    </div>
  )
}

Pane.propTypes = propTypes

const MemoizedPane = memo(Pane)

export default MemoizedPane
