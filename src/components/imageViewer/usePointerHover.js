import {
	useEffect,
	useRef,
} from 'react'

const usePointerHover = ({
	callback,
	domElementRef,
}) => {
	const callbackRef = useRef()

	callbackRef
	.current = callback

	useEffect(
		() => {
			const listener = () => {
				callbackRef
				.current()
			}

			const domElement = (
				domElementRef
				.current
			)

			domElement
			.addEventListener(
				'pointerenter',
				listener,
			)

			domElement
			.addEventListener(
				'pointerleave',
				listener,
			)

			return () => {
				domElement
				.removeEventListener(
					'pointerenter',
					listener,
				)

				domElement
				.removeEventListener(
					'pointerleave',
					listener,
				)
			}
		},
		[domElementRef],
	)
}

export default usePointerHover
