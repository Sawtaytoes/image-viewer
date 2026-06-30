import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import DeleteFileModal from "../toolkit/DeleteFileModal"
import WorkspaceContext from "../workspace/WorkspaceContext"
import ImageView from "./ImageView"
import ImageViewerContext from "./ImageViewerContext"
import Pane from "./Pane"
import RevealableChrome from "./RevealableChrome"
import TapFeedback from "./TapFeedback"
import useImageNavigation from "./useImageNavigation"
import useTapFeedback from "./useTapFeedback"
import useViewerKeyboard from "./useViewerKeyboard"

// Fade the immersive viewer in on open so the jump from gallery to columns
// reads as a transition rather than an instant cut.
const fadeIn = keyframes`
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
`

const imageViewerStyles = css`
	animation: ${fadeIn} 180ms ease;
	background-color: #333;
	height: 100%;
	left: 0;
	overflow: hidden;
	position: fixed;
	top: 0;
	/* A fast double-tap in the viewer would otherwise select the image/empty
	   text; nothing in here is meant to be selectable, so suppress it. */
	user-select: none;
	width: 100%;
`

// `gap: 2px` lets the dark viewer background show through as a hairline
// separator between columns — a subtle divider with negligible width loss.
const columnsRowStyles = css`
	display: flex;
	flex-direction: row;
	gap: 2px;
	height: 100%;
	width: 100%;
`

const legacyColumnStyles = css`
	flex: 1 1 0;
	height: 100%;
	min-width: 0;
	position: relative;
	touch-action: none;
`

const tapFeedbackLayerStyles = css`
	inset: 0;
	overflow: hidden;
	pointer-events: none;
	position: absolute;
	z-index: 5;
`

// Same blue inset ring the panes use, applied to the legacy single-image
// column only while the queue bar is revealed (see `Pane`'s `activePaneStyles`).
const activeLegacyColumnStyles = css`
	box-shadow: inset 0 0 0 3px #2a6f97;
`

const legacyColumnPropTypes = {
  isActive: PropTypes.bool.isRequired,
  isChromeRevealed: PropTypes.bool.isRequired,
  spawn: PropTypes.func.isRequired,
}

// The pre-columns single-image entry path (`imageFilePath` set), rendered as
// one column alongside any panes. Its center-tap still closes (`leaveImageViewer`)
// — unlike a pane, there's no folder to swap, so the "control this column" menu
// would only offer close anyway.
const LegacyImageColumn = ({
  isActive,
  isChromeRevealed,
  spawn,
}) => {
  const { imageFileName, imageFilePath, leaveImageViewer } =
    useContext(ImageViewerContext)

  const {
    goToNextImage,
    goToPreviousImage,
    isAtBeginning,
    isAtEnd,
  } = useImageNavigation()

  const [isDeleteModalOpen, setIsDeleteModalOpen] =
    useState(false)

  const close = useCallback(
    (point) => {
      if (point) {
        spawn({
          variant: "close",
          x: point.x,
          y: point.y,
        })
      }

      leaveImageViewer()
    },
    [leaveImageViewer, spawn],
  )

  const requestDelete = useCallback(() => {
    if (!imageFilePath) {
      return
    }

    setIsDeleteModalOpen(true)
  }, [imageFilePath])

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false)
  }, [])

  // The single-image view has no sibling list to fall through to, so deleting
  // drops back to the gallery (which re-reads the folder, now minus the file)
  // rather than trying to advance in place.
  const confirmDelete = useCallback(() => {
    if (!imageFilePath) {
      setIsDeleteModalOpen(false)

      return
    }

    window.api
      .deleteFilePath({
        filePath: imageFilePath,
        isDirectory: false,
      })
      .then(() => {
        setIsDeleteModalOpen(false)

        leaveImageViewer()
      })
  }, [imageFilePath, leaveImageViewer])

  // Only the active column owns the keyboard, so arrows don't drive a column
  // the user isn't looking at; the delete confirmation owns Enter/Esc while up.
  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled: isActive && !isDeleteModalOpen,
    onClose: close,
    onDelete: requestDelete,
  })

  return (
    <div
      css={[
        legacyColumnStyles,
        isActive &&
          isChromeRevealed &&
          activeLegacyColumnStyles,
      ]}
    >
      <ImageView
        goToNextImage={goToNextImage}
        goToPreviousImage={goToPreviousImage}
        imageFileName={imageFileName}
        imageFilePath={imageFilePath}
        isAtBeginning={isAtBeginning}
        isAtEnd={isAtEnd}
        onCenterTap={close}
      />

      <DeleteFileModal
        isVisible={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

LegacyImageColumn.propTypes = legacyColumnPropTypes

const ImageViewer = () => {
  const { imageFilePath } = useContext(ImageViewerContext)

  const { activePaneId, panes } = useContext(
    WorkspaceContext,
  )

  const { feedback, remove, spawn } = useTapFeedback()

  // Lifted out of RevealableChrome so the active column can outline itself only
  // while the queue bar is showing (the bar manages every transition; this is
  // just the shared source of truth). The viewer root is the swipe surface for
  // the drag-down-to-reveal gesture.
  const [isChromeVisible, setIsChromeVisible] =
    useState(true)

  const viewerRef = useRef()

  const isOpen = panes.length > 0 || Boolean(imageFilePath)

  if (!isOpen) {
    return null
  }

  // Columns-only once any column exists: the legacy single-image view only
  // shows when there are no panes, so it can never appear as a stray extra
  // column beside them.
  const hasLegacyColumn =
    panes.length === 0 && Boolean(imageFilePath)

  return (
    <div css={imageViewerStyles} ref={viewerRef}>
      <div css={columnsRowStyles}>
        {hasLegacyColumn && (
          <LegacyImageColumn
            isActive
            isChromeRevealed={isChromeVisible}
            spawn={spawn}
          />
        )}

        {panes.map((pane) => (
          <Pane
            isActive={pane.id === activePaneId}
            isChromeRevealed={isChromeVisible}
            key={pane.id}
            pane={pane}
            spawn={spawn}
          />
        ))}
      </div>

      <RevealableChrome
        isVisible={isChromeVisible}
        setIsVisible={setIsChromeVisible}
        spawn={spawn}
        viewerRef={viewerRef}
      />

      <div css={tapFeedbackLayerStyles}>
        {feedback.map((item) => (
          <TapFeedback
            key={item.id}
            onDone={() => {
              remove(item.id)
            }}
            variant={item.variant}
            x={item.x}
            y={item.y}
          />
        ))}
      </div>
    </div>
  )
}

const MemoizedImageViewer = memo(ImageViewer)

export default MemoizedImageViewer
