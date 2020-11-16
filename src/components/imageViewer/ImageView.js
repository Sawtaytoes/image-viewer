import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
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
	children: PropTypes.string.isRequired,
}

const ImageView = ({
	children: filePath,
}) => {
	const [
		isHoveringNextOverlay,
		setIsHoveringNextOverlay,
	] = useState(false)

	const [
		isHoveringPreviousOverlay,
		setIsHoveringPreviousOverlay,
	] = useState(false)

	const { leaveImageViewer } = (
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
		callback: () => {
			setIsHoveringNextOverlay(
				isHovering => (
					!isHovering
				)
			)
		},
		domElementRef: (
			navigateNextOverlayRef
		),
	})

	usePointerHover({
		callback: () => {
			setIsHoveringPreviousOverlay(
				isHovering => (
					!isHovering
				)
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
					filePath={filePath}
				/>
			</div>

			<div
				css={navigateNextOverlayStyles}
				onClick={goToNextImage}
				ref={navigateNextOverlayRef}
			/>

			<div
				css={navigatePreviousOverlayStyles}
				onClick={goToPreviousImage}
				ref={navigatePreviousOverlayRef}
			/>
		</div>
	)
}

ImageView.propTypes = propTypes

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
