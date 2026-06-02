import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  addFilePathToQueue,
  removeFilePathFromQueue,
} from "./imageLoaderActions"

const initialState = null

const reducerActions = {
  [addFilePathToQueue.type]: (
    _previousState,
    { payload },
  ) => payload.queueState,

  [removeFilePathFromQueue.type]: () => initialState,
}

const filePathsQueueReducer = createNamespaceReducer(
  createReducer(reducerActions, initialState),
)

export default filePathsQueueReducer
