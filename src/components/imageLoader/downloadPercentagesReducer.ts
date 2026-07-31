import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  type ImageLoaderAction,
  resetDownloadedPercentage,
  updateDownloadPercentage,
} from "./imageLoaderActions"

const initialState: number | null = null

const reducerActions = {
  [resetDownloadedPercentage.type]: () => initialState,

  // Only `updateDownloadPercentage` reaches this handler, and its payload
  // always carries the percentage — the `in` check is how TypeScript reads it
  // off the store-wide payload union without a cast.
  [updateDownloadPercentage.type]: (
    state: number | null,
    { payload }: ImageLoaderAction,
  ) =>
    "downloadPercentage" in payload &&
    payload.downloadPercentage !== undefined
      ? payload.downloadPercentage
      : state,
}

const downloadPercentagesReducer = createNamespaceReducer(
  createReducer<number | null, ImageLoaderAction>(
    reducerActions,
    initialState,
  ),
)

export default downloadPercentagesReducer
