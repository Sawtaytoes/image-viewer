import createNamespaceReducer from './createNamespaceReducer'
import createReducer from './createReducer'

import {
	resetDownloadedPercentage,
	updateDownloadPercentage,
} from './imageLoaderActions'

const initialState = null

const reducerActions = {
	[resetDownloadedPercentage.type]: () => (
		initialState
	),

	[updateDownloadPercentage.type]: (
		state,
		{ payload },
	) => (
		payload
		.downloadPercentage
	),
}

const downloadPercentageReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default downloadPercentageReducer
