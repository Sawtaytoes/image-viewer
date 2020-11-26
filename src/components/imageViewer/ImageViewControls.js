import ArrowBackRoundedIcon from '@material-ui/icons/ArrowBackRounded'
import ArrowForwardRoundedIcon from '@material-ui/icons/ArrowForwardRounded'
import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
} from 'react'

import ImageViewerContext from './ImageViewerContext'
import useImageNavigation from './useImageNavigation'

const fileNameStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const imageViewControlsStyles = css`
	align-items: center;
	color: #fafafa;
	display: flex;
	justify-content: space-between;
	user-select: none;
`

const navigationIconStyles = css`
	padding: 4px;
`

const ImageViewControls = () => {
	const {
		imageFileName,
		leaveImageViewer,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const {
		goToNextImage,
		goToPreviousImage,
		isAtBeginning,
		isAtEnd,
	} = useImageNavigation()

	useEffect(
		() => {
			const keyConfigurations = {
				ArrowLeft: goToPreviousImage,
				ArrowRight: goToNextImage,
				ControlLeft: goToNextImage,
				ShiftLeft: goToPreviousImage,
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
						isAtBeginning
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
				onClick={leaveImageViewer}
				title={imageFileName}
			>
				{imageFileName}
			</div>

			<div
				css={css`
					${navigationIconStyles}
					${
						isAtEnd
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
