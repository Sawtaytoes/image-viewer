import {
	useEffect,
	useRef,
} from 'react'

const useResizableSquareContainerEffect = domElementRef => {
	const animationFrameIdRef = useRef()

	useEffect(
		() => {
			const resizeContainer = () => {
				if (
					!(
						domElementRef
						.current
					)
				) {
					return
				}

				const boxedHeight = (
					domElementRef
					.current
					.clientWidth
				)

				domElementRef
				.current
				.style
				.setProperty(
					'height',
					`${boxedHeight}px`,
				)
			}

			const throttleResize = () => {
				if (
					animationFrameIdRef
					.current
				) {
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
				domElementRef
				.current
			)

			return () => {
				resizeObserver
				.disconnect()
			}
		},
		[domElementRef],
	)
}

export default useResizableSquareContainerEffect
