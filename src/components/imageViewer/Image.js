import PropTypes from 'prop-types'
import {
	memo,
	useEffect,
	useMemo,
	useRef,
} from 'react'

const path = global.require('path')

const propTypes = {
	children: PropTypes.string.isRequired,
}

const Image = ({
	children: filePath,
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
			canvasRef.current.style.height = '100%'
			canvasRef.current.style.width = '100%'

			const imageDomElement = (
				document
				.createElement('img')
			)

			const loadCanvasWithImage = () => {
				canvasRef.current.style.height = '100%'
				canvasRef.current.style.width = '100%'

				const isPortrait = (
					canvasRef.current.clientHeight
					> canvasRef.current.clientWidth
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

				canvasRef.current.height = imageHeight
				canvasRef.current.width = imageWidth

				canvasRef.current.style.height = 'auto'
				canvasRef.current.style.width = 'auto'

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
			.alt = fileName

			imageDomElement
			.loading = 'lazy'

			imageDomElement
			.src = webSafeFilePath

			imageDomElement
			.addEventListener(
				'load',
				loadCanvasWithImage,
			)

			return () => {
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
