import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  addFilePathToProcessingQueue,
  type ImageLoaderAction,
  removeFilePathFromProcessingQueue,
} from "./imageLoaderActions"

// Left as the bare `null` it is rather than annotated `boolean | null`: the
// slice's value type is stated once, on `createReducer` below, and annotating
// it here would make this a boolean-typed variable that the `is`/`has` naming
// rule then demands be renamed — which it should not be.
const initialState = null

const reducerActions = {
  [addFilePathToProcessingQueue.type]: () => true,

  [removeFilePathFromProcessingQueue.type]: () =>
    initialState,
}

const processingQueueReducer = createNamespaceReducer(
  createReducer<boolean | null, ImageLoaderAction>(
    reducerActions,
    initialState,
  ),
)

export default processingQueueReducer
