import { css } from '@emotion/core'
import {
	memo,
	useContext,
} from 'react'

import ImageView from './ImageView'
import ImageViewControls from './ImageViewControls'
import ImageViewerContext from './ImageViewerContext'

const imageViewerStyles = css`
	background-color: #333;
	display: flex;
	flex-direction: column;
	height: 100%;
	left: 0;
	position: fixed;
	top: 0;
	width: 100%;
`

const imageViewStyles = css`
	flex: 1 0 auto;
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
				<ImageViewControls />

				<div css={imageViewStyles}>
					<ImageView>
						{imageFilePath}
					</ImageView>
				</div>
			</div>
		)
		: null
	)
}

const MemoizedImageViewer = memo(ImageViewer)

export default MemoizedImageViewer
