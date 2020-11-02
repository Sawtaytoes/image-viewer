import {
	useCallback,
	useContext,
	useMemo,
} from 'react'

import FileSystemContext from '../fileBrowser/FileSystemContext'
import ImageViewerContext from './ImageViewerContext'

const useImageNavigation = () => {
	const {
		imageFilePaths,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const {
		imageFilePath,
		setImageFilePath,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const imageFileIndex = (
		useMemo(
			() => (
				imageFilePaths
				.indexOf(
					imageFilePath
				)
			),
			[
				imageFilePath,
				imageFilePaths,
			],
		)
	)

	const goToNextImage = (
		useCallback(
			() => {
				setImageFilePath(
					imageFilePaths
					[
						Math.min(
							imageFileIndex + 1,
							imageFilePaths.length - 1,
						)
					]
				)
			},
			[
				imageFileIndex,
				imageFilePaths,
				setImageFilePath,
			],
		)
	)

	const goToPreviousImage = (
		useCallback(
			() => {
				setImageFilePath(
					imageFilePaths
					[
						Math.max(
							imageFileIndex - 1,
							0,
						)
					]
				)
			},
			[
				imageFileIndex,
				imageFilePaths,
				setImageFilePath,
			],
		)
	)

	return {
		goToNextImage,
		goToPreviousImage,
		isAtBeginning: imageFileIndex === 0,
		isAtEnd: imageFileIndex === imageFilePaths.length - 1,
	}
}

export default useImageNavigation
