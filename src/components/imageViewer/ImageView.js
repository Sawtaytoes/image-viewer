import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import Image from '../imageViewer/Image'
import ImageViewerContext from '../imageViewer/ImageViewerContext'

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
		<div onClick={leaveImageViewer}>
			<Image>
				{filePath}
			</Image>
		</div>
	)
}

ImageView.propTypes = propTypes

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
