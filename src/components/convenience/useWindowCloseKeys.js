import { useEffect } from 'react'

const useWindowCloseKeys = () => {
	useEffect(
		() => {
			const onKeyDown = event => {
				event
				.preventDefault()

				if (
					(
						event.altKey
						&& event.code === 'F4'
					)
					|| (
						event.ctrlKey
						&& event.code === 'KeyW'
					)
				) {
					window
					.close()
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

export default useWindowCloseKeys
