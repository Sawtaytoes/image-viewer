import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import Image from '../imageViewer/Image'
import ImageViewerContext from '../imageViewer/ImageViewerContext'

const imageFileStyles = css`
	align-items: center;
	cursor: pointer;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
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
	fileName: PropTypes.string.isRequired,
	filePath: PropTypes.string.isRequired,
}

const ImageFile = ({
	fileName,
	filePath,
}) => {
	const {
		setImageFile,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const goToImage = (
		useCallback(
			() => {
				setImageFile({
					name: fileName,
					path: filePath,
				})
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
