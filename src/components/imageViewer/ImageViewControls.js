import ArrowBackRoundedIcon from '@material-ui/icons/ArrowBackRounded'
import ArrowForwardRoundedIcon from '@material-ui/icons/ArrowForwardRounded'
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
import {
	getPreviousArrayIndex,
	getNextArrayIndex,
} from './arrayIndexNavigation'

const path = global.require('path')

const fileNameStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const imageViewControlsStyles = css`
	align-items: center;
	color: white;
	display: flex;
	justify-content: space-between;
`

const navigationIconStyles = css`
	padding: 4px;
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
						getPreviousArrayIndex(
							imageFileIndex,
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
						getNextArrayIndex(
							imageFileIndex,
							imageFilePaths.length,
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
			<div
				css={css`
					${navigationIconStyles}
					${
						imageFileIndex === 0
						&& 'visibility: hidden;'
					}
				`}
				onClick={goToPreviousImage}
				title="< Previous Photo"
			>
				<ArrowBackRoundedIcon />
			</div>

			<div
				css={fileNameStyles}
				title={imageFileName}
			>
				{imageFileName}
			</div>

			<div
				css={css`
					${navigationIconStyles}
					${
						imageFileIndex === imageFilePaths.length - 1
						&& 'visibility: hidden;'
					}
				`}
				onClick={goToNextImage}
				title="Next Photo >"
			>
				<ArrowForwardRoundedIcon />
			</div>
		</div>
	)
}

const MemoizedImageViewControls = memo(ImageViewControls)

export default MemoizedImageViewControls
