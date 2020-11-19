import {
	useCallback,
	useContext,
	useMemo,
} from 'react'

import FileSystemContext from '../fileBrowser/FileSystemContext'
import ImageViewerContext from './ImageViewerContext'

const useImageNavigation = () => {
	const {
		imageFiles,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const {
		imageFilePath,
		setImageFile,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const imageFileIndex = (
		useMemo(
			() => (
				imageFiles
				.findIndex(({
					path,
				}) => (
					imageFilePath === path
				))
			),
			[
				imageFilePath,
				imageFiles,
			],
		)
	)

	const goToNextImage = (
		useCallback(
			() => {
				setImageFile(
					imageFiles
					[
						Math.min(
							imageFileIndex + 1,
							imageFiles.length - 1,
						)
					]
				)
			},
			[
				imageFileIndex,
				imageFiles,
				setImageFile,
			],
		)
	)

	const goToPreviousImage = (
		useCallback(
			() => {
				setImageFile(
					imageFiles
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
				imageFiles,
				setImageFile,
			],
		)
	)

	return {
		goToNextImage,
		goToPreviousImage,
		isAtBeginning: imageFileIndex === 0,
		isAtEnd: imageFileIndex === imageFiles.length - 1,
	}
}

export default useImageNavigation
