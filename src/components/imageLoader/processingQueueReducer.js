import createNamespaceReducer from './createNamespaceReducer'
import createReducer from './createReducer'

import {
	addFilePathToProcessingQueue,
	removeFilePathFromProcessingQueue,
} from './imageLoaderActions'

const initialState = null

const reducerActions = {
	[addFilePathToProcessingQueue
	.type]: () => (
		true
	),

	[removeFilePathFromProcessingQueue
	.type]: () => (
		initialState
	),
}

const processingQueueReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default processingQueueReducer
