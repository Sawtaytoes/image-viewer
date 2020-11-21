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

			const onPointerInitialMovement = event => {
				throttleHoverStateNotification(
					event
				)

				domElement
				.removeEventListener(
					'pointermove',
					onPointerInitialMovement,
				)
			}

			const onMouseUp = event => {
				if (event.pointerType !== 'touch') {
					throttleHoverStateNotification(
						event
					)
				}
			}

			const domElement = (
				domElementRef
				.current
			)

			domElement
			.addEventListener(
				'pointerup',
				onMouseUp,
			)

			domElement
			.addEventListener(
				'pointerenter',
				throttleHoverStateNotification,
			)

			domElement
			.addEventListener(
				'pointermove',
				onPointerInitialMovement,
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
					onMouseUp,
				)

				domElement
				.removeEventListener(
					'pointerenter',
					throttleHoverStateNotification,
				)

				domElement
				.removeEventListener(
					'pointermove',
					onPointerInitialMovement,
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
