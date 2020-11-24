import createNamespaceReducer from './createNamespaceReducer'
import createReducer from './createReducer'

import {
	addFilePathToPriorityQueue,
	removeFilePathFromPriorityQueue,
} from './imageLoaderActions'

const initialState = null

const reducerActions = {
	[addFilePathToPriorityQueue.type]: () => (
		true
	),

	[removeFilePathFromPriorityQueue.type]: () => (
		initialState
	),
}

const priorityQueueReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default priorityQueueReducer
