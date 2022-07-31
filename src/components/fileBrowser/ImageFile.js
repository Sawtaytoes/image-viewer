import { css } from '@emotion/react'
import { ipcRenderer } from 'electron'
import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useContext,
	useRef,
} from 'react'

import Image from '../imageViewer/Image'
import ImageViewerContext from '../imageViewer/ImageViewerContext'
import useKeyboardControls from '../convenience/useKeyboardControls'

const imageFileStyles = css`
	align-items: center;
	cursor: pointer;
	display: flex;
	justify-content: center;
	width: 100%;
	padding-bottom: 100%;
	position: relative;
`

const imageFileContentStyles = css`
	height: 100%;
	left: 0;
	position: absolute;
	top: 0;
	width: 100%;
`

const propTypes = {
	fileName: PropTypes
	.string
	.isRequired,
	filePath: PropTypes
	.string
	.isRequired,
}

const ImageFile = ({
	fileName,
	filePath,
}) => {
	const isCtrlKeyHeldRef = useRef(false)

	const {
		setImageFile,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	useKeyboardControls(event => {
		isCtrlKeyHeldRef
		.current = (
			event
			.ctrlKey
		)
	})

	const goToImage = (
		useCallback(
			() => {
				if (
					isCtrlKeyHeldRef
					.current
				) {
					ipcRenderer
					.send(
						'createNewWindow',
						{ filePath },
					)
				}
				else {
					setImageFile({
						name: fileName,
						path: filePath,
					})
				}
			},
			[
				fileName,
				filePath,
				setImageFile,
			],
		)
	)

	return (
		<div
			css={imageFileStyles}
			onClick={goToImage}
		>
			<div css={imageFileContentStyles}>
				<Image
					fileName={fileName}
					filePath={filePath}
					hasVisibilityDetection
				/>
			</div>
		</div>
	)
}

ImageFile.propTypes = propTypes

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
