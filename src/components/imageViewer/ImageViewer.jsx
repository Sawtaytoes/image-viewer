import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useCallback, useContext } from "react"

import WorkspaceContext from "../workspace/WorkspaceContext"
import ImageView from "./ImageView"
import ImageViewerContext from "./ImageViewerContext"
import Pane from "./Pane"
import RevealableChrome from "./RevealableChrome"
import TapFeedback from "./TapFeedback"
import useImageNavigation from "./useImageNavigation"
import useTapFeedback from "./useTapFeedback"
import useViewerKeyboard from "./useViewerKeyboard"

const imageViewerStyles = css`
	background-color: #333;
	height: 100%;
	left: 0;
	overflow: hidden;
	position: fixed;
	top: 0;
	width: 100%;
`

const columnsRowStyles = css`
	display: flex;
	flex-direction: row;
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

const legacyColumnPropTypes = {
  spawn: PropTypes.func.isRequired,
}

// The pre-columns single-image entry path (`imageFilePath` set, no panes),
// rendered as one column so it stays visually/behaviorally identical to today.
const LegacyImageColumn = ({ spawn }) => {
  const { imageFileName, imageFilePath, leaveImageViewer } =
    useContext(ImageViewerContext)

  const {
    goToNextImage,
    goToPreviousImage,
    isAtBeginning,
    isAtEnd,
  } = useImageNavigation()

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

  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled: true,
    onClose: close,
  })

  return (
    <div css={legacyColumnStyles}>
      <ImageView
        goToNextImage={goToNextImage}
        goToPreviousImage={goToPreviousImage}
        imageFileName={imageFileName}
        imageFilePath={imageFilePath}
        isAtBeginning={isAtBeginning}
        isAtEnd={isAtEnd}
        onClose={close}
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

  const isOpen = panes.length > 0 || Boolean(imageFilePath)

  if (!isOpen) {
    return null
  }

  const activePane =
    panes.find((pane) => pane.id === activePaneId) ??
    panes[0]

  return (
    <div css={imageViewerStyles}>
      <div css={columnsRowStyles}>
        {panes.length > 0 ? (
          panes.map((pane) => (
            <Pane
              isActive={pane.id === activePane?.id}
              key={pane.id}
              pane={pane}
              spawn={spawn}
            />
          ))
        ) : (
          <LegacyImageColumn spawn={spawn} />
        )}
      </div>

      <RevealableChrome spawn={spawn} />

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
