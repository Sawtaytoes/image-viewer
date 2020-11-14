import PropTypes from 'prop-types'
import {
	memo,
	useEffect,
	useMemo,
	useRef,
} from 'react'

const path = global.require('path')

const propTypes = {
	filePath: PropTypes.string.isRequired,
}

const Image = ({
	filePath,
}) => {
	const canvasRef = useRef()

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

			const imageDomElement = (
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
						imageDomElement.height / imageDomElement.width
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
						imageDomElement.width / imageDomElement.height
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
					imageDomElement,
					0,
					0,
					imageWidth,
					imageHeight,
				)
			}

			imageDomElement
			.setAttribute(
				'alt',
				fileName,
			)

			imageDomElement
			.setAttribute(
				'src',
				webSafeFilePath,
			)

			imageDomElement
			.addEventListener(
				'load',
				loadCanvasWithImage,
			)

			return () => {
				imageDomElement
				.removeAttribute(
					'src',
				)

				imageDomElement
				.removeEventListener(
					'load',
					loadCanvasWithImage,
				)
			}
		},
		[
			fileName,
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
