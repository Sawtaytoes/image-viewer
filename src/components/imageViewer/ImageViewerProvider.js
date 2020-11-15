import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useMemo,
	useState,
} from 'react'

import ImageViewerContext from './ImageViewerContext'

const path = global.require('path')

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

	const leaveImageViewer = (
		useCallback(
			() => {
				const imageFileName = (
					path
					.basename(
						imageFilePath
					)
				)

				setImageFilePath(
					null
				)

				document
				.querySelector(
					`[title="${imageFileName}"]`
				)
				.scrollIntoViewIfNeeded()
			},
			[
				imageFilePath,
				setImageFilePath,
			],
		)
	)

	const imageViewerProviderValue = (
		useMemo(
			() => ({
				imageFilePath,
				leaveImageViewer,
				setImageFilePath,
			}),
			[
				imageFilePath,
				leaveImageViewer,
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
