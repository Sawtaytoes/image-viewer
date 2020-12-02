import { remote } from 'electron'
import fs from 'fs'
import path from 'path'
import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useMemo,
	useState,
} from 'react'

import ImageViewerContext from './ImageViewerContext'

const filePathMainProcessArg = (
	remote
	.getGlobal('processArgs')
	[1]
)

const filePathRendererProcessArg = (
	(
		(
			process
			.argv
			.find(arg => (
				arg
				.startsWith('--filePath')
			))
		)
		|| ''
	)
	.replace(
		'--filePath=',
		''
	)
)

const filePathArg = (
	filePathRendererProcessArg
	|| filePathMainProcessArg
	|| ''
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
