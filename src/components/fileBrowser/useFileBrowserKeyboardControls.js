import {
	useEffect,
	useRef,
} from 'react'

const useFileBrowserKeyboardControls = callback => {
	const callbackRef = useRef()

	callbackRef
	.current = callback

	useEffect(
		() => {
			const onKeyDown = event => {
				event
				.preventDefault()

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

export default useFileBrowserKeyboardControls
