import {
	memo,
	useCallback,
	useContext,
	useMemo,
} from 'react'

import FileSystemContext from '../fileBrowser/FileSystemContext'
import ImageViewerContext from './ImageViewerContext'

const path = global.require('path')
const { css } = global.require('@emotion/core')

const imageViewControlsStyles = css`
	align-items: center;
	color: white;
	display: flex;
	justify-content: space-between;
`

const ImageViewControls = () => {
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

	const imageFileName = (
		useMemo(
			() => (
				path
				.basename(
					imageFilePath
				)
			),
			[imageFilePath],
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

	return (
		<div css={imageViewControlsStyles}>
			<div onClick={goToPreviousImage}>
				{
					imageFileIndex === 0
					? ''
					: '< Previous'
				}
			</div>

			{imageFileName}

			<div onClick={goToNextImage}>
				{
					imageFileIndex === imageFilePaths.length - 1
					? ''
					: 'Next >'
				}
			</div>
		</div>
	)
}

const MemoizedImageViewControls = memo(ImageViewControls)

export default MemoizedImageViewControls
