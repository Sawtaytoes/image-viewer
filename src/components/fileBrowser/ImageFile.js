import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
	useRef,
} from 'react'

import Image from '../imageViewer/Image'
import ImageViewerContext from '../imageViewer/ImageViewerContext'
import useResizableSquareContainerEffect from './useResizableSquareContainerEffect'

const imageFileStyles = css`
	align-items: center;
	cursor: pointer;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
	justify-content: center;
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
	const imageContainerRef = useRef()

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

	useResizableSquareContainerEffect(
		imageContainerRef
	)

	return (
		<div
			css={imageFileStyles}
			onClick={goToImage}
			ref={imageContainerRef}
		>
			<Image
				fileName={fileName}
				filePath={filePath}
				hasVisibilityDetection
			/>
		</div>
	)
}

ImageFile.propTypes = propTypes

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
