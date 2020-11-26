import { useEffect } from 'react'

const scrollKeys = [
	'ArrowUp',
	'ArrowDown',
	'ArrowRight',
	'ArrowLeft',
	'PageUp',
	'PageDown',
	'Home',
	'End',
]

const useDisableScrollKeyFunctions = () => {
	useEffect(
		() => {
			const onKeyDown = event => {
				if (
					scrollKeys
					.includes(
						event
						.code
					)
				) {
					event
					.preventDefault()
				}
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

export default useDisableScrollKeyFunctions
