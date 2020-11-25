import createNamespaceReducer from './createNamespaceReducer'
import createReducer from './createReducer'

import {
	addImageDomElement,
	removeImageDomElement,
} from './imageLoaderActions'

const initialState = null

const reducerActions = {
	[addImageDomElement.type]: (
		state,
		{ payload },
	) => (
		payload
		.imageDomElement
	),

	[removeImageDomElement.type]: () => (
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
