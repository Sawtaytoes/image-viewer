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
	) => {
		const imageDomElement = (
			document
			.createElement('img')
		)

		imageDomElement
		.setAttribute(
			'src',
			(
				payload
				.fileBlobUrl
			),
		)

		return imageDomElement
	},

	[removeDownloadedFile.type]: () => (
		initialState
	),
}

const imageDomElementsReducer = (
	createNamespaceReducer(
		createReducer(
			reducerActions,
			initialState,
		)
	)
)

export default imageDomElementsReducer
