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
		.fileContents
	),

	[removeDownloadedFile.type]: () => (
		initialState
	),
}

const downloadedFilesReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default downloadedFilesReducer
