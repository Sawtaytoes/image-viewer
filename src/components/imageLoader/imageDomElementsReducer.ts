import createNamespaceReducer from "./createNamespaceReducer"
import createReducer from "./createReducer"

import {
  addImageDomElement,
  type ImageLoaderAction,
  removeImageDomElement,
} from "./imageLoaderActions"

const initialState: HTMLImageElement | null = null

const reducerActions = {
  // `addImageDomElement` is the only action carrying the decoded `<img>`; the
  // `in` check is how TypeScript reads it off the store-wide payload union
  // without a cast.
  [addImageDomElement.type]: (
    state: HTMLImageElement | null,
    { payload }: ImageLoaderAction,
  ) =>
    "imageDomElement" in payload
      ? payload.imageDomElement
      : state,

  [removeImageDomElement.type]: () => initialState,
}

const imageDomElementsReducer = createNamespaceReducer(
  createReducer<HTMLImageElement | null, ImageLoaderAction>(
    reducerActions,
    initialState,
  ),
)

export default imageDomElementsReducer
