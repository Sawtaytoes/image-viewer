import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"

import FillRing from "../fileBrowser/FillRing"
import Image from "./Image"
import useLongPress from "./useLongPress"
import usePointerHover from "./usePointerHover"
import useWheelNavigation from "./useWheelNavigation"

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
  // Optional: a press-and-hold on the center zone (vs. a quick tap, which fires
  // `onCenterTap`). When omitted, a hold does nothing special and still ends as
  // a tap on release (the legacy single-image column has no hold action).
  onCenterHold: PropTypes.func,
  onCenterTap: PropTypes.func.isRequired,
}

const ImageView = ({
  goToNextImage,
  goToPreviousImage,
  imageFileName,
  imageFilePath,
  isAtBeginning,
  isAtEnd,
  onCenterHold,
  onCenterTap,
}) => {
  const [isHoveringNextOverlay, setIsHoveringNextOverlay] =
    useState(false)

  const [
    isHoveringPreviousOverlay,
    setIsHoveringPreviousOverlay,
  ] = useState(false)

  const rootRef = useRef()
  const navigateNextOverlayRef = useRef()
  const navigatePreviousOverlayRef = useRef()
  const centerZoneRef = useRef()

  // A completed hold opens the menu mid-gesture; swallow the trailing `click`
  // (fired on release) so it doesn't also fire the tap action.
  const suppressNextCenterClickRef = useRef(false)

  const [centerHoldProgress, setCenterHoldProgress] =
    useState(0)

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

  // Fire on `click`, not `pointerdown`: this tap usually changes what's
  // rendered (closes the viewer, or opens the per-column menu). On
  // `pointerdown` the viewer would unmount mid-tap and the trailing
  // `pointerup`/`click` would fall through to the gallery thumbnail behind it
  // (the "double-tap to gallery then opens an image" bug). A `click` is
  // delivered to this zone as one unit, and React only re-renders afterward.
  const onCenterClick = useCallback(
    (event) => {
      event.stopPropagation()

      if (suppressNextCenterClickRef.current) {
        suppressNextCenterClickRef.current = false

        return
      }

      onCenterTap({ x: event.clientX, y: event.clientY })
    },
    [onCenterTap],
  )

  const onCenterHoldProgress = useCallback((fraction) => {
    setCenterHoldProgress(fraction)
  }, [])

  const onCenterHoldComplete = useCallback(
    ({ event }) => {
      setCenterHoldProgress(0)

      // No hold action (legacy column): let the release fall through as a tap.
      if (!onCenterHold) {
        return
      }

      suppressNextCenterClickRef.current = true

      onCenterHold({ x: event.clientX, y: event.clientY })
    },
    [onCenterHold],
  )

  const onCenterHoldCancel = useCallback(() => {
    setCenterHoldProgress(0)
  }, [])

  useLongPress({
    domElementRef: centerZoneRef,
    onCancel: onCenterHoldCancel,
    onComplete: onCenterHoldComplete,
    onProgress: onCenterHoldProgress,
  })

  // Wheel ("middle mouse") up/down steps the image like the left/right zones.
  useWheelNavigation({
    domElementRef: rootRef,
    goToNextImage,
    goToPreviousImage,
  })

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
    <div css={imageViewStyles} ref={rootRef}>
      <div css={imageStyles}>
        <Image
          fileName={imageFileName}
          filePath={imageFilePath}
        />
      </div>

      <div
        css={centerCloseZoneStyles}
        onClick={onCenterClick}
        ref={centerZoneRef}
      >
        {centerHoldProgress > 0 && (
          <FillRing progress={centerHoldProgress} />
        )}
      </div>

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
