import PropTypes from 'prop-types'
import {
	memo,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

const path = global.require('path')

const propTypes = {
	filePath: PropTypes.string.isRequired,
	hasVisibilityDetection: PropTypes.bool,
}

const Image = ({
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

	const canvasRef = useRef()
	const imageRef = useRef()
	const isImageLoadedRef = useRef(false)

	const webSafeFilePath = (
		useMemo(
			() => (
				filePath
				.replace(
					'#',
					'%23',
				)
			),
			[filePath],
		)
	)

	const fileName = (
		useMemo(
			() => (
				path
				.basename(
					filePath
				)
			),
			[filePath],
		)
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
							.isVisible
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
			if (!isVisible) {
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
					// Fixes issue where canvas is unmounted and then this function runs because the observer noticed a change.
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
					(
						canvasRef
						.current
						.clientHeight
					)
					> (
						canvasRef
						.current
						.clientWidth
					)
				)

				const imageHeight = (
					isPortrait
					? (
						imageRef.current.height / imageRef.current.width
						* canvasRef.current.clientWidth
					)
					: (
						canvasRef.current.clientHeight
					)
				)

				const imageWidth = (
					isPortrait
					? (
						canvasRef.current.clientWidth
					)
					: (
						imageRef.current.width / imageRef.current.height
						* canvasRef.current.clientHeight
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

			const imageLoaded = () => {
				isImageLoadedRef
				.current = true

				loadCanvasWithImage()
			}

			imageRef
			.current
			.setAttribute(
				'alt',
				fileName,
			)

			imageRef
			.current
			.setAttribute(
				'src',
				webSafeFilePath,
			)

			imageRef
			.current
			.addEventListener(
				'load',
				imageLoaded,
			)

			const resizeObserver = (
				new ResizeObserver(
					loadCanvasWithImage
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
			isVisible,
			webSafeFilePath,
		],
	)

	return (
		<canvas
			height="100%"
			ref={canvasRef}
			title={fileName}
			width="100%"
		/>
	)
}

Image.propTypes = propTypes

const MemoizedImage = memo(Image)

export default MemoizedImage
