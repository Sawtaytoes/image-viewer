import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  addDownloadedFile,
  type ImageLoaderAction,
  removeDownloadedFile,
} from "./imageLoaderActions"

const initialState: string | null = null

const reducerActions = {
  // `addDownloadedFile` is the only action routed here that carries a blob URL;
  // the `in` check is what lets TypeScript read it off the store-wide payload
  // union without a cast, and it is true every time this handler runs.
  [addDownloadedFile.type]: (
    state: string | null,
    { payload }: ImageLoaderAction,
  ) =>
    "fileBlobUrl" in payload ? payload.fileBlobUrl : state,

  [removeDownloadedFile.type]: () => initialState,
}

const downloadedFilesReducer = createNamespaceReducer(
  createReducer<string | null, ImageLoaderAction>(
    reducerActions,
    initialState,
  ),
)

export default downloadedFilesReducer
