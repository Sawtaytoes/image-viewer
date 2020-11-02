import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
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

const navigateNextOverlayStyles = css`
	height: 100%;
	position: absolute;
	right: 0;
	top: 0;
	opacity: 0.15;
	width: 37.5%;

	&:hover {
		background-color: white;
	}
`

const navigatePreviousOverlayStyles = css`
	height: 100%;
	position: absolute;
	left: 0;
	top: 0;
	opacity: 0.15;
	width: 37.5%;

	&:hover {
		background-color: white;
	}
`

const propTypes = {
	children: PropTypes.string.isRequired,
}

const ImageView = ({
	children: filePath,
}) => {
	const {
		setImageFilePath,
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

	const leaveImageViewer = (
		useCallback(
			() => {
				setImageFilePath(
					null
				)
			},
			[setImageFilePath],
		)
	)

	return (
		<div css={imageViewStyles}>
			<div
				css={imageViewStyles}
				onClick={leaveImageViewer}
			>
				<Image>
					{filePath}
				</Image>
			</div>

			<div
				css={css`
					${navigatePreviousOverlayStyles}
					${
						isAtBeginning
						&& 'background-color: transparent;'
					}
				`}
				onClick={goToPreviousImage}
			/>

			<div
				css={css`
					${navigateNextOverlayStyles}
					${
						isAtEnd
						&& 'background-color: transparent;'
					}
				`}
				onClick={goToNextImage}
			/>
		</div>
	)
}

ImageView.propTypes = propTypes

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
