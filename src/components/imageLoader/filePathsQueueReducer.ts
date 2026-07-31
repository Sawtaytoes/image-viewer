import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  addFilePathToQueue,
  type ImageLoaderAction,
  removeFilePathFromQueue,
} from "./imageLoaderActions"

const initialState: string | null = null

const reducerActions = {
  // `addFilePathToQueue` is the only action carrying a `queueState`; the `in`
  // check is how TypeScript reads it off the store-wide payload union without
  // a cast.
  [addFilePathToQueue.type]: (
    previousState: string | null,
    { payload }: ImageLoaderAction,
  ) =>
    "queueState" in payload
      ? payload.queueState
      : previousState,

  [removeFilePathFromQueue.type]: () => initialState,
}

const filePathsQueueReducer = createNamespaceReducer(
  createReducer<string | null, ImageLoaderAction>(
    reducerActions,
    initialState,
  ),
)

export default filePathsQueueReducer
