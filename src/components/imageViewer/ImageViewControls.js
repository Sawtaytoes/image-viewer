import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
} from 'react'

import FileSystemContext from '../fileBrowser/FileSystemContext'
import ImageViewerContext from './ImageViewerContext'

const path = global.require('path')

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

	useEffect(
		() => {
			const keyConfigurations = {
				ArrowLeft: goToPreviousImage,
				ArrowRight: goToNextImage,
				ControlLeft: goToPreviousImage,
				ShiftLeft: goToNextImage,
			}

			const onKeyDown = ({
				code,
			}) => {
				keyConfigurations[code]
				&& keyConfigurations[code]()
			}

			window
			.addEventListener(
				'keydown',
				onKeyDown,
			)

			return () => {
				window
				.removeEventListener(
					'keydown',
					onKeyDown,
				)
			}
		},
		[
			goToPreviousImage,
			goToNextImage,
		],
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
