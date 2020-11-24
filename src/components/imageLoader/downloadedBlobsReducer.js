import createNamespaceReducer from './createNamespaceReducer'
import createReducer from './createReducer'

import {
	addDownloadedFile,
	removeDownloadedFile,
} from './imageLoaderActions'

const initialState = null

const reducerActions = {
	[addDownloadedFile.type]: (
		state,
		{ payload },
	) => (
		payload
		.fileBlob
	),

	[removeDownloadedFile.type]: () => (
		initialState
	),
}

const downloadedBlobsReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default downloadedBlobsReducer
