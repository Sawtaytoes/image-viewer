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

			const onPointerInitialMovement = event => {
				hoverStateNotification(
					event
				)

				domElement
				.removeEventListener(
					'pointermove',
					onPointerInitialMovement,
				)
			}

			const domElement = (
				domElementRef
				.current
			)

			domElement
			.addEventListener(
				'pointerup',
				hoverStateNotification,
			)

			domElement
			.addEventListener(
				'pointerenter',
				hoverStateNotification,
			)

			domElement
			.addEventListener(
				'pointermove',
				onPointerInitialMovement,
			)

			domElement
			.addEventListener(
				'pointerout',
				hoverStateNotification,
			)

			return () => {
				domElement
				.removeEventListener(
					'pointerup',
					hoverStateNotification,
				)

				domElement
				.removeEventListener(
					'pointerenter',
					hoverStateNotification,
				)

				domElement
				.removeEventListener(
					'pointermove',
					onPointerInitialMovement,
				)

				domElement
				.removeEventListener(
					'pointerout',
					hoverStateNotification,
				)
			}
		},
		[domElementRef],
	)
}

export default usePointerHover
