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
	const imageRef = useRef()
	const isImageLoadedRef = useRef(false)

	const {
		unloadImage,
		updateImageVisibility,
	} = (
		useContext(
			ImageLoaderContext
		)
	)

	const {
		imageDataUrl = null,
		percentDownloaded = 0,
	} = (
		useStateSelector(
			({
				downloadedFiles,
				downloadPercentages,
			}) => ({
				imageDataUrl: (
					downloadedFiles
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
		() => () => {
			// Added `hasVisibilityDetection` as a temporary fix for when images are unmounted from `ImageViewer` but thumbnails are still loaded.
			hasVisibilityDetection
			&& (
				unloadImage({
					filePath,
				})
			)
		},
		[
			filePath,
			hasVisibilityDetection,
			unloadImage,
		],
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
			if (!imageDataUrl) {
				return
			}

			isImageLoadedRef
			.current = false

			imageRef
			.current = (
				document
				.createElement('img')
			)

			const loadCanvasWithImage = () => {
				if (
					!(
						isImageLoadedRef
						.current
					)
					|| !(
						imageRef
						.current
					)
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
						(imageRef.current.height / imageRef.current.width)
						* canvasRef.current.clientWidth
					)
					> (
						canvasRef.current.clientHeight
					)
				)

				const canvasImageWidth = (
					isHeightRestricted
					? (
						(imageRef.current.width / imageRef.current.height)
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
						(imageRef.current.height / imageRef.current.width)
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
					imageRef
					.current,
					0,
					0,
					canvasImageWidth,
					canvasImageHeight,
				)

				imageRef
				.current = null

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

			const imageLoaded = () => {
				isImageLoadedRef
				.current = true

				throttleCanvasLoading()
			}

			imageRef
			.current
			.setAttribute(
				'src',
				imageDataUrl,
			)

			imageRef
			.current
			.addEventListener(
				'load',
				imageLoaded,
			)

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

			const canvas = (
				canvasRef
				.current
			)

			return () => {
				if (!hasVisibilityDetection) {
					canvas
					.style
					.setProperty(
						'visibility',
						'hidden',
					)
				}

				if (
					!(
						isImageLoadedRef
						.current
					)
					&& (
						imageRef
						.current
					)
				) {
					imageRef
					.current
					.removeAttribute(
						'src',
					)
				}

				if (
					imageRef
					.current
				) {
					imageRef
					.current
					.removeEventListener(
						'load',
						loadCanvasWithImage,
					)
				}

				resizeObserver
				.disconnect()
			}
		},
		[
			fileName,
			hasVisibilityDetection,
			imageDataUrl,
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
