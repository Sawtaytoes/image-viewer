import {
	memo,
	useContext,
} from 'react'

import ImageView from './ImageView'
import ImageViewControls from './ImageViewControls'
import ImageViewerContext from './ImageViewerContext'

const { css } = global.require('@emotion/core')

const imageViewerStyles = css`
	background-color: #333;
	height: 100vh;
	left: 0;
	position: fixed;
	top: 0;
	width: 100vw;
`

const ImageViewer = () => {
	const {
		imageFilePath,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	return (
		imageFilePath
		? (
			<div css={imageViewerStyles}>
				<ImageView>
					{imageFilePath}
				</ImageView>

				<ImageViewControls />
			</div>
		)
		: null
	)
}

const MemoizedImageViewer = memo(ImageViewer)

export default MemoizedImageViewer
