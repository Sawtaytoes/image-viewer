import {
	useContext,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'

import ImageLoaderContext from './ImageLoaderContext'

const useStateSelector = (
	stateSelector,
	dependencies,
) => {
	const stateSelectorRef = useRef()

	stateSelectorRef
	.current = (
		stateSelector
	)

	const {
		createStateObservable,
	} = (
		useContext(
			ImageLoaderContext
		)
	)

	const [
		state,
		setState,
	] = (
		useState({})
	)

	useLayoutEffect(
		() => {
			const subscriber = (
				createStateObservable(
					stateSelectorRef
					.current
				)
				.subscribe(
					setState
				)
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[
			createStateObservable,
			// eslint-disable-next-line react-hooks/exhaustive-deps
			...dependencies,
		],
	)

	return state
}

export default useStateSelector
