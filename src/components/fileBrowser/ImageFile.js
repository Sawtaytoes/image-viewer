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

const ImageFile = ({
	children: filePath,
}) => {
	const {
		setImageFilePath,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const goToImage = (
		useCallback(
			() => {
				setImageFilePath(
					filePath
				)
			},
			[
				filePath,
				setImageFilePath,
			],
		)
	)

	return (
		<div onClick={goToImage}>
			<Image>
				{filePath}
			</Image>
		</div>
	)
}

ImageFile.propTypes = propTypes

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
