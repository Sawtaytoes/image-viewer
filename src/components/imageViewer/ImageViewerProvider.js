import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useMemo,
	useState,
} from 'react'

import ImageViewerContext from './ImageViewerContext'

const fs = global.require('fs')
const path = global.require('path')
const { remote } = global.require('electron')

const filePathArg = (
	remote
	.getGlobal('processArgs')
	[1]
)

const initialImageFile = (
	(
		filePathArg
		&& (
			fs
			.lstatSync(
				filePathArg
			)
			.isFile()
		)
	)
	? {
		name: (
			path
			.basename(
				filePathArg
			)
		),
		path: filePathArg,
	}
	: {}
)

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
				setImageFile({})
			},
			[setImageFile],
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
