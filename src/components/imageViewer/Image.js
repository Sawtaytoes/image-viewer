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
		useState(
			!hasVisibilityDetection
		)
	)

	const [
		percentComplete,
		setPercentComplete,
	] = (
		useState(0)
	)

	const [
		imageDataUrl,
		setImageDataUrl,
	] = (
		useState(null)
	)

	const animationFrameIdRef = useRef()
	const canvasRef = useRef()
	const imageRef = useRef()
	const isImageLoadedRef = useRef(false)

	const {
		createStateObservable,
		unloadImage,
		updateImageVisibility,
	} = (
		useContext(
			ImageLoaderContext
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
			const subscriber = (
				createStateObservable(({
					downloadPercentages,
				}) => ({
					downloadPercentage: (
						downloadPercentages
						[filePath]
					),
				}))
				.subscribe(({
					downloadPercentage,
				}) => {
					setPercentComplete(
						downloadPercentage
						|| 0
					)
				})
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[
			createStateObservable,
			filePath,
		],
	)

	useEffect(
		() => {
			const subscriber = (
				createStateObservable(({
					downloadedFiles,
				}) => ({
					imageFileBlobUrl: (
						downloadedFiles
						[filePath]
					),
				}))
				.subscribe(({
					imageFileBlobUrl,
				}) => {
					setImageDataUrl(
						imageFileBlobUrl
						|| null
					)
				})
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[
			createStateObservable,
			filePath,
		],
	)

	useEffect(
		() => {
			if (!hasVisibilityDetection) {
				return
			}

			const intersectionObserver = (
				new IntersectionObserver(
					([intersectionObserverEntry]) => {
						setIsVisible(
							intersectionObserverEntry
							.isIntersecting
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
		},
		[
			filePath,
			isVisible,
			updateImageVisibility,
		],
	)

	useEffect(
		() => {
			if (!imageDataUrl) {
				return
			}

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
					'height',
					'100%',
				)

				canvasRef
				.current
				.style
				.setProperty(
					'width',
					'100%',
				)

				const isPortrait = (
					Object
					.is(
						(
							canvasRef
							.current
							.clientHeight
						),
						(
							canvasRef
							.current
							.clientWidth
						),
					)
					? (
						(
							imageRef
							.current
							.height
						)
						> (
							imageRef
							.current
							.width
						)
					)
					: (
						(
							canvasRef
							.current
							.clientHeight
						)
						< (
							canvasRef
							.current
							.clientWidth
						)
					)
				)

				const imageHeight = (
					isPortrait
					? (
						canvasRef.current.clientHeight
					)
					: (
						(imageRef.current.height / imageRef.current.width)
						* canvasRef.current.clientWidth
					)
				)

				const imageWidth = (
					isPortrait
					? (
						(imageRef.current.width / imageRef.current.height)
						* canvasRef.current.clientHeight
					)
					: (
						canvasRef.current.clientWidth
					)
				)

				canvasRef
				.current
				.setAttribute(
					'height',
					imageHeight,
				)

				canvasRef
				.current
				.setAttribute(
					'width',
					imageWidth,
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
				.style
				.setProperty(
					'width',
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
					imageWidth,
					imageHeight,
				)
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

			return () => {
				if (
					!(
						isImageLoadedRef
						.current
					)
				) {
					imageRef
					.current
					.removeAttribute(
						'src',
					)
				}

				imageRef
				.current
				.removeEventListener(
					'load',
					loadCanvasWithImage,
				)

				resizeObserver
				.disconnect()
			}
		},
		[
			fileName,
			imageDataUrl,
			isVisible,
		],
	)

	return (
		<div css={imageStyles}>
			{
				percentComplete !== 100
				&& (
					<progress
						css={imageLoadingProgressStyles}
						max="100"
						value={percentComplete}
					>
						{percentComplete}
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
