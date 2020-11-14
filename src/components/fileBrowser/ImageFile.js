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
	background-color: #fffffa;
	border-radius: 14px;
	border: 2px solid lightgray;
	color: #333;
	cursor: pointer;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
	justify-content: center;
	padding: 10px 14px;
	width: 100%;
`

const propTypes = {
	children: PropTypes.string.isRequired,
}

const ImageFile = ({
	children: filePath,
}) => {
	const {
		setImageFilePath,
	} = (
		useContext(
			ImageViewerContext
		)
	)

	const goToImage = (
		useCallback(
			() => {
				setImageFilePath(
					filePath
				)
			},
			[
				filePath,
				setImageFilePath,
			],
		)
	)

	return (
		<div
			css={imageFileStyles}
			onClick={goToImage}
		>
			<Image
				filePath={filePath}
			/>
		</div>
	)
}

ImageFile.propTypes = propTypes

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
