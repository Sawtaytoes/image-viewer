import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'

import ImageLoaderContext from '../imageLoader/ImageLoaderContext'
import useStateSelector from '../imageLoader/useStateSelector'

const imageStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	position: relative;
	width: 100%;
`

const imageLoadingProgressStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 24px;
`

const imageCanvasStyles = css`
	height: 100%;
	position: absolute;
	width: 100%;
`

const propTypes = {
	fileName: PropTypes.string.isRequired,
	filePath: PropTypes.string.isRequired,
	hasVisibilityDetection: PropTypes.bool,
}

const Image = ({
	fileName,
	filePath,
	hasVisibilityDetection = false,
}) => {
	const [
		isVisible,
		setIsVisible,
	] = (
		useState(false)
	)

	const animationFrameIdRef = useRef()
	const canvasRef = useRef()

	const {
		updateImageVisibility,
	} = (
		useContext(
			ImageLoaderContext
		)
	)

	const {
		imageDomElement,
		percentDownloaded = 0,
	} = (
		useStateSelector(
			({
				downloadPercentages,
				imageDomElements,
			}) => ({
				imageDomElement: (
					imageDomElements
					[filePath]
				),
				percentDownloaded: (
					downloadPercentages
					[filePath]
				),
			}),
			[filePath],
		)
	)

	useEffect(
		() => {
			const intersectionObserver = (
				new IntersectionObserver(
					([intersectionObserverEntry]) => {
						setIsVisible(
							hasVisibilityDetection
							? (
								intersectionObserverEntry
								.isVisible
							)
							: (
								intersectionObserverEntry
								.isIntersecting
							)
						)
					},
					{
						delay: 100,
						trackVisibility: true,
					},
				)
			)

			intersectionObserver
			.observe(
				canvasRef
				.current
			)

			return () => {
				intersectionObserver
				.disconnect()
			}
		},
		[hasVisibilityDetection],
	)

	useEffect(
		() => {
			updateImageVisibility({
				filePath,
				isVisible,
			})

			return () => {
				if (!hasVisibilityDetection) {
					updateImageVisibility({
						filePath,
						isVisible: !isVisible,
					})
				}
			}
		},
		[
			filePath,
			hasVisibilityDetection,
			isVisible,
			updateImageVisibility,
		],
	)

	useEffect(
		() => {
			if (!imageDomElement) {
				return
			}

			const loadCanvasWithImage = () => {
				if (
					!imageDomElement
					|| !(
						canvasRef
						.current
					)
				) {
					return
				}

				canvasRef
				.current
				.style
				.setProperty(
					'width',
					'100%',
				)

				canvasRef
				.current
				.style
				.setProperty(
					'height',
					'100%',
				)

				const isHeightRestricted = (
					(
						(imageDomElement.height / imageDomElement.width)
						* canvasRef.current.clientWidth
					)
					> (
						canvasRef.current.clientHeight
					)
				)

				const canvasImageWidth = (
					isHeightRestricted
					? (
						(imageDomElement.width / imageDomElement.height)
						* canvasRef.current.clientHeight
					)
					: (
						canvasRef.current.clientWidth
					)
				)

				const canvasImageHeight = (
					isHeightRestricted
					? (
						canvasRef.current.clientHeight
					)
					: (
						(imageDomElement.height / imageDomElement.width)
						* canvasRef.current.clientWidth
					)
				)

				canvasRef
				.current
				.setAttribute(
					'width',
					canvasImageWidth,
				)

				canvasRef
				.current
				.setAttribute(
					'height',
					canvasImageHeight,
				)

				canvasRef
				.current
				.style
				.setProperty(
					'width',
					'auto',
				)

				canvasRef
				.current
				.style
				.setProperty(
					'height',
					'auto',
				)

				canvasRef
				.current
				.getContext('2d')
				.drawImage(
					imageDomElement,
					0,
					0,
					canvasImageWidth,
					canvasImageHeight,
				)

				if (!hasVisibilityDetection) {
					canvasRef
					.current
					.style
					.setProperty(
						'visibility',
						'visible',
					)
				}
			}

			const throttleCanvasLoading = () => {
				if (animationFrameIdRef.current) {
					return
				}

				animationFrameIdRef
				.current = (
					window
					.requestAnimationFrame(() => {
						animationFrameIdRef
						.current = null

						loadCanvasWithImage()
					})
				)
			}

			const resizeObserver = (
				new ResizeObserver(
					throttleCanvasLoading
				)
			)

			resizeObserver
			.observe(
				canvasRef
				.current
				.parentElement
			)

			return () => {
				if (!hasVisibilityDetection) {
					canvasRef
					.current
					.style
					.setProperty(
						'visibility',
						'hidden',
					)
				}

				resizeObserver
				.disconnect()
			}
		},
		[
			fileName,
			hasVisibilityDetection,
			imageDomElement,
		],
	)

	return (
		<div css={imageStyles}>
			{
				percentDownloaded !== 100
				&& (
					<progress
						css={imageLoadingProgressStyles}
						max="100"
						value={percentDownloaded}
					>
						{percentDownloaded}
					</progress>
				)
			}

			<canvas
				css={imageCanvasStyles}
				ref={canvasRef}
				title={fileName}
			/>
		</div>
	)
}

Image.propTypes = propTypes

const MemoizedImage = memo(Image)

export default MemoizedImage
