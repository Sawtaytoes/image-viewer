import createNamespaceReducer from './createNamespaceReducer'
import createReducer from './createReducer'

import {
	addFilePathToStandbyQueue,
	removeFilePathFromStandbyQueue,
} from './imageLoaderActions'

const initialState = null

const reducerActions = {
	[addFilePathToStandbyQueue.type]: () => (
		true
	),

	[removeFilePathFromStandbyQueue.type]: () => (
		initialState
	),
}

const standbyQueueReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default standbyQueueReducer
