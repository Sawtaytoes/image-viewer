import { useEffect } from 'react'

const useF5RefreshEffect = () => {
	useEffect(
		() => {
			const onKeyDown = ({
				code,
			}) => {
				if (code === 'F5') {
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

export default useF5RefreshEffect
