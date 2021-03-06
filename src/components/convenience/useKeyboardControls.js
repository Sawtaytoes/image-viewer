import {
	useEffect,
	useRef,
} from 'react'

const useKeyboardControls = callback => {
	const callbackRef = useRef()

	callbackRef
	.current = callback

	useEffect(
		() => {
			const onKeyDown = event => {
				callbackRef
				.current(event)
			}

			window
			.addEventListener(
				'keydown',
				onKeyDown,
			)

			return () => {
				window
				.removeEventListener(
					'keydown',
					onKeyDown,
				)
			}
		},
		[],
	)
}

export default useKeyboardControls
