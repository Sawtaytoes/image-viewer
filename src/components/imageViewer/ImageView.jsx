import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"

import Image from "./Image"
import usePointerHover from "./usePointerHover"

const imageViewStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	position: relative;
	width: 100%;
`

const imageStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	position: absolute;
	width: 100%;
`

// Bounded close zone sitting between the two 30% nav zones, so edge taps
// navigate and only a center tap closes.
const centerCloseZoneStyles = css`
	bottom: 0;
	left: 30%;
	position: absolute;
	right: 30%;
	top: 0;
`

const navigationControlsStyles = css`
	background-color: #fafafa;
	height: 100%;
	position: absolute;
	top: 0;
	width: 30%;
`

const hideNavigationControlStyles = css`
	opacity: 0;

	&:focus,
	&:active {
		opacity: 0;
	}
`

const showNavigationControlStyles = css`
	opacity: 0.15;
`

const unavailableNavigationStyles = css`
	background-color: red;
`

const propTypes = {
  goToNextImage: PropTypes.func.isRequired,
  goToPreviousImage: PropTypes.func.isRequired,
  imageFileName: PropTypes.string.isRequired,
  imageFilePath: PropTypes.string.isRequired,
  isAtBeginning: PropTypes.bool.isRequired,
  isAtEnd: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

const ImageView = ({
  goToNextImage,
  goToPreviousImage,
  imageFileName,
  imageFilePath,
  isAtBeginning,
  isAtEnd,
  onClose,
}) => {
  const [isHoveringNextOverlay, setIsHoveringNextOverlay] =
    useState(false)

  const [
    isHoveringPreviousOverlay,
    setIsHoveringPreviousOverlay,
  ] = useState(false)

  const navigateNextOverlayRef = useRef()
  const navigatePreviousOverlayRef = useRef()

  usePointerHover({
    callback: ({ isHovering }) => {
      setIsHoveringNextOverlay(isHovering)
    },
    domElementRef: navigateNextOverlayRef,
  })

  usePointerHover({
    callback: ({ isHovering }) => {
      setIsHoveringPreviousOverlay(isHovering)
    },
    domElementRef: navigatePreviousOverlayRef,
  })

  const onCenterPointerDown = useCallback(
    (event) => {
      onClose({ x: event.clientX, y: event.clientY })
    },
    [onClose],
  )

  const navigateNextOverlayStyles = useMemo(
    () => css`
				${navigationControlsStyles}
				${hideNavigationControlStyles}
				right: 0;

				${isHoveringNextOverlay && showNavigationControlStyles}

				${isAtEnd && unavailableNavigationStyles}
			`,
    [isAtEnd, isHoveringNextOverlay],
  )

  const navigatePreviousOverlayStyles = useMemo(
    () => css`
				${navigationControlsStyles}
				${hideNavigationControlStyles}
				left: 0;

				${isHoveringPreviousOverlay && showNavigationControlStyles}

				${isAtBeginning && unavailableNavigationStyles}
			`,
    [isAtBeginning, isHoveringPreviousOverlay],
  )

  return (
    <div css={imageViewStyles}>
      <div css={imageStyles}>
        <Image
          fileName={imageFileName}
          filePath={imageFilePath}
        />
      </div>

      <div
        css={centerCloseZoneStyles}
        onPointerDown={onCenterPointerDown}
      />

      <div
        css={navigateNextOverlayStyles}
        onPointerDown={goToNextImage}
        ref={navigateNextOverlayRef}
      />

      <div
        css={navigatePreviousOverlayStyles}
        onPointerDown={goToPreviousImage}
        ref={navigatePreviousOverlayRef}
      />
    </div>
  )
}

ImageView.propTypes = propTypes

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
