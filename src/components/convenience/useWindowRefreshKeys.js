import { useEffect } from 'react'

const useWindowRefreshKeys = () => {
	useEffect(
		() => {
			const onKeyDown = event => {
				if (event.code === 'F5') {
					window
					.location
					.reload()
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

export default useWindowRefreshKeys
