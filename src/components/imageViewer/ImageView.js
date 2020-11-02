import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import Image from '../imageViewer/Image'
import ImageViewerContext from '../imageViewer/ImageViewerContext'

const imageViewStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	width: 100%;
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
		<div
			css={imageViewStyles}
			onClick={leaveImageViewer}
		>
			<Image>
				{filePath}
			</Image>
		</div>
	)
}

ImageView.propTypes = propTypes

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
