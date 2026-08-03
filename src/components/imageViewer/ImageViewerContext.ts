import type { Dispatch, SetStateAction } from "react"
import { createContext } from "react"

import type { ImageFile } from "../../types"

// The legacy single-image view's current file. Empty (`{}`) when nothing is
// open: `ImageViewerProvider` boots it from the launch argument (or `{}`) and
// `leaveImageViewer` clears it back to `{}` rather than to `null`, so readers
// treat a missing `name`/`path` as "closed".
export type ViewerImageFile = Partial<ImageFile>

export interface ImageViewerContextValue {
  // `undefined` whenever no single image is open.
  imageFileName: string | undefined
  imageFilePath: string | undefined
  leaveImageViewer: () => void
  setImageFile: Dispatch<SetStateAction<ViewerImageFile>>
}

// There is no sensible standalone value — `ImageViewerProvider` wraps the whole
// app (see `App.tsx`), and the pre-conversion default was `undefined`, so
// reading this outside a provider already threw. Throwing members keep that
// "this is a bug" behaviour while giving consumers a non-optional value to
// destructure.
const missingProvider = (): never => {
  throw new Error(
    "ImageViewerContext was read outside ImageViewerProvider",
  )
}

const ImageViewerContext =
  createContext<ImageViewerContextValue>({
    imageFileName: undefined,
    imageFilePath: undefined,
    leaveImageViewer: missingProvider,
    setImageFile: missingProvider,
  })

export default ImageViewerContext
