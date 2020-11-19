import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react'

import Image from './Image'
import ImageViewerContext from './ImageViewerContext'
import useImageNavigation from './useImageNavigation'
import usePointerHover from './usePointerHover'

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

const navigationControlsStyles = css`
	background-color: white;
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

const propTypes = {
	imageFileName: PropTypes.string.isRequired,
	imageFilePath: PropTypes.string.isRequired,
}

const ImageView = ({
	imageFileName,
	imageFilePath,
}) => {
	const [
		isHoveringNextOverlay,
		setIsHoveringNextOverlay,
	] = useState(false)

	const [
		isHoveringPreviousOverlay,
		setIsHoveringPreviousOverlay,
	] = useState(false)

	const {
		leaveImageViewer,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const {
		goToNextImage,
		goToPreviousImage,
		isAtBeginning,
		isAtEnd,
	} = useImageNavigation()

	const navigateNextOverlayRef = useRef()
	const navigatePreviousOverlayRef = useRef()

	usePointerHover({
		callback: ({
			isHovering,
		}) => {
			setIsHoveringNextOverlay(
				isHovering
			)
		},
		domElementRef: (
			navigateNextOverlayRef
		),
	})

	usePointerHover({
		callback: ({
			isHovering,
		}) => {
			setIsHoveringPreviousOverlay(
				isHovering
			)
		},
		domElementRef: (
			navigatePreviousOverlayRef
		),
	})

	const navigateNextOverlayStyles = (
		useMemo(
			() => (
				css`
					${navigationControlsStyles}
					${hideNavigationControlStyles}
					right: 0;

					${
						isHoveringNextOverlay
						&& showNavigationControlStyles
					}

					${
						isAtEnd
						&& hideNavigationControlStyles
					}
				`
			),
			[
				isAtEnd,
				isHoveringNextOverlay,
			],
		)
	)

	const navigatePreviousOverlayStyles = (
		useMemo(
			() => (
				css`
					${navigationControlsStyles}
					${hideNavigationControlStyles}
					left: 0;

					${
						isHoveringPreviousOverlay
						&& showNavigationControlStyles
					}

					${
						isAtBeginning
						&& hideNavigationControlStyles
					}
				`
			),
			[
				isAtBeginning,
				isHoveringPreviousOverlay,
			],
		)
	)

	return (
		<div css={imageViewStyles}>
			<div
				css={imageStyles}
				onClick={leaveImageViewer}
			>
				<Image
					fileName={imageFileName}
					filePath={imageFilePath}
				/>
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
