import { createContext } from "react"

import type {
  FilePathPayload,
  VisibilityPayload,
} from "./imageLoaderActions"
import type { CreateStateObservable } from "./reduxObservable"

// What `ImageLoaderProvider` hands its subtree: the refcount pair that keeps a
// cached blob alive, the visibility channel that drives lazy loading, and a
// subscription to the store for reading a path's blob URL / decoded element.
export interface ImageLoaderContextValue {
  createStateObservable: CreateStateObservable
  releaseImage: (payload: FilePathPayload) => void
  retainImage: (payload: FilePathPayload) => void
  updateImageVisibility: (
    payload: VisibilityPayload,
  ) => void
}

// The default throws rather than being `undefined`: reading this context
// outside a provider is a wiring mistake, and the untyped version crashed on
// the destructure at the call site. Failing here says which context is missing.
const throwMissingProvider = (): never => {
  throw new Error(
    "ImageLoaderContext was read outside an ImageLoaderProvider.",
  )
}

const ImageLoaderContext =
  createContext<ImageLoaderContextValue>({
    createStateObservable: throwMissingProvider,
    releaseImage: throwMissingProvider,
    retainImage: throwMissingProvider,
    updateImageVisibility: throwMissingProvider,
  })

export default ImageLoaderContext
