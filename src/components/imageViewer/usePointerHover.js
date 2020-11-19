import {
	useEffect,
	useRef,
} from 'react'

const hoverStates = {
	pointerenter: true,
	pointermove: true,
	pointerout: false,
	pointerup: true,
}

const usePointerHover = ({
	callback,
	domElementRef,
}) => {
	const animationFrameIdRef = useRef()
	const callbackRef = useRef()

	callbackRef
	.current = callback

	useEffect(
		() => {
			const hoverStateNotification = event => {
				callbackRef
				.current({
					event,
					isHovering: (
						hoverStates
						[event.type]
					),
				})
			}

			const throttleHoverStateNotification = event => {
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

						hoverStateNotification(
							event
						)
					})
				)
			}

			const firstPointerMove = event => {
				throttleHoverStateNotification(
					event
				)

				domElement
				.removeEventListener(
					'pointermove',
					firstPointerMove,
				)
			}

			const domElement = (
				domElementRef
				.current
			)

			domElement
			.addEventListener(
				'pointerup',
				throttleHoverStateNotification,
			)

			domElement
			.addEventListener(
				'pointerenter',
				throttleHoverStateNotification,
			)

			domElement
			.addEventListener(
				'pointermove',
				firstPointerMove,
			)

			domElement
			.addEventListener(
				'pointerout',
				throttleHoverStateNotification,
			)

			return () => {
				domElement
				.removeEventListener(
					'pointerup',
					throttleHoverStateNotification,
				)

				domElement
				.removeEventListener(
					'pointerenter',
					throttleHoverStateNotification,
				)

				domElement
				.removeEventListener(
					'pointermove',
					firstPointerMove,
				)

				domElement
				.removeEventListener(
					'pointerout',
					throttleHoverStateNotification,
				)
			}
		},
		[domElementRef],
	)
}

export default usePointerHover
