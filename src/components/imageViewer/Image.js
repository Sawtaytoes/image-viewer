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
}

const Image = ({
	filePath,
}) => {
	const [
		isVisible,
		setIsVisible,
	] = useState(false)

	const canvasRef = useRef()
	const imageRef = useRef()

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
		[],
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
				loadCanvasWithImage,
			)

			return () => {
				imageRef
				.current
				.removeAttribute(
					'src',
				)

				imageRef
				.current
				.removeEventListener(
					'load',
					loadCanvasWithImage,
				)
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
			ref={canvasRef}
			title={fileName}
		/>
	)
}

Image.propTypes = propTypes

const MemoizedImage = memo(Image)

export default MemoizedImage
