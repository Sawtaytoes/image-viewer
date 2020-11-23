import createNamespaceReducerCreator from './createNamespaceReducerCreator'

const getPreviousState = ({
	namespace,
	previousNamespaceState,
}) => (
	previousNamespaceState[namespace]
)

const removeNamespaceFromState = ({
	namespace,
	previousNamespaceState,
}) => {
	const nextNamespaceState = { ...previousNamespaceState }

	Reflect
	.deleteProperty(
		nextNamespaceState,
		namespace,
	)

	return nextNamespaceState
}

const updateNamespaceState = ({
	namespace,
	nextState,
	previousNamespaceState,
}) => ({
	...previousNamespaceState,
	[namespace]: nextState,
})

const createNamespaceReducer = (
	reducer,
	initialNamespaceState = {},
) => {
	if (typeof initialNamespaceState !== 'object') {
		throw new Error(
			'`initialNamespaceState` not set to type `object` in `createNamespaceReducer`.'
		)
	}

	return (
		createNamespaceReducerCreator(
			reducer,
			initialNamespaceState,
			{
				getPreviousState,
				removeNamespaceFromState,
				updateNamespaceState,
			},
		)
	)
}

export default createNamespaceReducer
