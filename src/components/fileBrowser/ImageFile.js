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
	filePath: PropTypes.string.isRequired,
}

const ImageFile = ({
	filePath,
}) => {
	const imageContainerRef = useRef()

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

	useResizableSquareContainerEffect(
		imageContainerRef
	)

				imageContainerRef
				.current
				.style
				.setProperty(
					'height',
					`${boxedHeight}px`,
				)
			}

			const throttleResize = () => {
				if (animationFrameIdRef.current) {
					return
				}

				animationFrameIdRef
				.current = (
					window
					.requestAnimationFrame(() => {
						animationFrameIdRef
						.current = null

						resizeContainer()
					})
				)
			}

			const resizeObserver = (
				new ResizeObserver(
					throttleResize
				)
			)

			resizeObserver
			.observe(
				imageContainerRef
				.current
			)

			return () => {
				resizeObserver
				.disconnect()
			}
		},
		[],
	)

	return (
		<div
			css={imageFileStyles}
			onClick={goToImage}
			ref={imageContainerRef}
		>
			<Image
				filePath={filePath}
				hasVisibilityDetection
			/>
		</div>
	)
}

ImageFile.propTypes = propTypes

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
