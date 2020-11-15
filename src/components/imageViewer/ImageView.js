import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useMemo,
} from 'react'

import Image from './Image'
import ImageViewerContext from './ImageViewerContext'
import useImageNavigation from './useImageNavigation'

const imageViewStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	position: relative;
	width: 100%;
`

const navigateNextOverlayBaseStyles = css`
	height: 100%;
	position: absolute;
	right: 0;
	top: 0;
	width: 30%;

	&:hover {
		background-color: white;
		opacity: 0.15;
	}
`

const navigatePreviousOverlayBaseStyles = css`
	height: 100%;
	position: absolute;
	left: 0;
	top: 0;
	width: 30%;

	&:hover {
		background-color: white;
		opacity: 0.15;
	}
`

const propTypes = {
	children: PropTypes.string.isRequired,
}

const ImageView = ({
	children: filePath,
}) => {
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

	const navigateNextOverlayStyles = (
		useMemo(
			() => (
				css`
					${navigateNextOverlayBaseStyles}
					${
						isAtEnd
						&& 'background-color: transparent;'
					}
				`
			),
			[isAtEnd],
		)
	)
	const navigatePreviousOverlayStyles = (
		useMemo(
			() => (
				css`
					${navigatePreviousOverlayBaseStyles}
					${
						isAtBeginning
						&& 'background-color: transparent;'
					}
				`
			),
			[isAtBeginning],
		)
	)

	return (
		<div css={imageViewStyles}>
			<div
				css={imageViewStyles}
				onClick={leaveImageViewer}
			>
				<Image
					filePath={filePath}
				/>
			</div>

			<div
				css={navigatePreviousOverlayStyles}
				onClick={goToPreviousImage}
			/>

			<div
				css={navigateNextOverlayStyles}
				onClick={goToNextImage}
			/>
		</div>
	)
}

ImageView.propTypes = propTypes

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
