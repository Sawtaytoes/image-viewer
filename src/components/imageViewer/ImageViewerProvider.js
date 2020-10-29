import PropTypes from 'prop-types'
import {
	memo,
	useMemo,
	useState,
} from 'react'

import ImageViewerContext from './ImageViewerContext'

const propTypes = {
	children: PropTypes.node.isRequired,
}

const ImageViewerProvider = ({
	children,
}) => {
	const [
		imageFilePath,
		setImageFilePath,
	] = useState(null)

	const imageViewerProviderValue = (
		useMemo(
			() => ({
				imageFilePath,
				setImageFilePath,
			}),
			[
				imageFilePath,
				setImageFilePath,
			],
		)
	)

	return (
		<ImageViewerContext.Provider
			value={imageViewerProviderValue}
		>
			{children}
		</ImageViewerContext.Provider>
	)
}

ImageViewerProvider.propTypes = propTypes

const MemoizedImageViewerProvider = memo(ImageViewerProvider)

export default MemoizedImageViewerProvider
