const createReducer = (
	reducerActions,
	initialState,
) => (
	state = initialState,
	action,
) => (
	reducerActions[action.type]
	? (
		reducerActions[action.type](
			state,
			action,
		)
	)
	: state
)

export default createReducer
