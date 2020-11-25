import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useMemo,
	useState,
} from 'react'

import ImageViewerContext from './ImageViewerContext'

const initialImageFile = {}

const propTypes = {
	children: PropTypes.node.isRequired,
}

const ImageViewerProvider = ({
	children,
}) => {
	const [
		imageFile,
		setImageFile,
	] = (
		useState(
			initialImageFile
		)
	)

	const leaveImageViewer = (
		useCallback(
			() => {
				setImageFile(
					initialImageFile
				)

				// TEMP. This is no longer working. It needs to be rewritten to scroll to the virtualized list item as `next` is clicked. Also would be good to have an animation on the selected image thumbnail.
				// document
				// .querySelector(
				// 	`[title="${imageFile.name}"]`
				// )
				// .scrollIntoViewIfNeeded()
			},
			[
				imageFile,
				setImageFile,
			],
		)
	)

	const imageViewerProviderValue = (
		useMemo(
			() => ({
				imageFileName: (
					imageFile
					.name
				),
				imageFilePath: (
					imageFile
					.path
				),
				leaveImageViewer,
				setImageFile,
			}),
			[
				imageFile,
				leaveImageViewer,
				setImageFile,
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
