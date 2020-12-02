import path from 'path'
import {
	useContext,
	useEffect,
} from 'react'

import FileSystemContext from '../fileBrowser/FileSystemContext'
import ImageViewerContext from '../imageViewer/ImageViewerContext'

const TitleBar = () => {
	const {
		filePath,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const {
		imageFilePath,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	useEffect(
		() => {
			document
			.title = (
				(
					imageFilePath
					? (
						path
						.join(
							(
								path
								.basename(
									filePath
								)
							),
							(
								path
								.basename(
									imageFilePath
								)
							),
						)
						.concat(
							' | '
						)
						.concat(
							path
							.dirname(
								filePath
							)
						)
					)
					: (
						path
						.basename(
							filePath
						)
						.concat(
							' | '
						)
						.concat(
							path
							.dirname(
								filePath
							)
						)
					)
				)
				.concat(
					' | '
				)
				.concat(
					'Image Viewer'
				)
			)
		},
		[
			filePath,
			imageFilePath,
		],
	)

	return null
}

export default TitleBar
