import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  releaseFilePath,
  retainFilePath,
} from "./imageLoaderActions"

const initialState = 0

const reducerActions = {
  [retainFilePath.type]: (state) => state + 1,

  [releaseFilePath.type]: (state) => Math.max(0, state - 1),
}

// Flat `{ [filePath]: holderCount }`. A "holder" is anything that needs the
// decoded blob kept alive (an open folder pane, the full-screen viewer). When
// the count returns to its `initialState` of `0`, `createNamespaceReducer`
// drops the key entirely, so a missing entry reads as "no holders".
const referenceCountsReducer = createNamespaceReducer(
  createReducer(reducerActions, initialState),
)

export default referenceCountsReducer
