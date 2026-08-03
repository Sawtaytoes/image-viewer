import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react"
import {
  createStateObservable,
  dispatchReduxAction,
  reduxObservable$,
} from "./createdReduxObservable"
import ImageLoaderContext, {
  type ImageLoaderContextValue,
} from "./ImageLoaderContext"
import {
  addFilePath,
  type FilePathPayload,
  releaseFilePath,
  retainFilePath,
  type VisibilityPayload,
} from "./imageLoaderActions"

interface ImageLoaderProviderProps {
  children: ReactNode
}

const ImageLoaderProvider = ({
  children,
}: ImageLoaderProviderProps) => {
  useEffect(() => {
    const subscriber = reduxObservable$.subscribe()

    return () => {
      subscriber.unsubscribe()
    }
  }, [])

  // Refcount lifecycle: a holder (an open folder pane, the full-screen viewer)
  // retains a path while it needs the cached blob alive and releases it when
  // done. The blob is only evicted once the last holder releases — see
  // `referenceCountEpic`. This is orthogonal to `updateImageVisibility`, which
  // still drives lazy loading + priority-queue ordering.
  const retainImage = useCallback(
    ({ filePath }: FilePathPayload) => {
      dispatchReduxAction(
        retainFilePath({
          filePath,
        }),
      )
    },
    [],
  )

  const releaseImage = useCallback(
    ({ filePath }: FilePathPayload) => {
      dispatchReduxAction(
        releaseFilePath({
          filePath,
        }),
      )
    },
    [],
  )

  const updateImageVisibility = useCallback(
    ({ filePath, isVisible }: VisibilityPayload) => {
      dispatchReduxAction(
        addFilePath({
          filePath,
          isVisible,
        }),
      )
    },
    [],
  )

  const imageLoaderProviderValue: ImageLoaderContextValue =
    useMemo(
      () => ({
        createStateObservable,
        releaseImage,
        retainImage,
        updateImageVisibility,
      }),
      [releaseImage, retainImage, updateImageVisibility],
    )

  return (
    <ImageLoaderContext.Provider
      value={imageLoaderProviderValue}
    >
      {children}
    </ImageLoaderContext.Provider>
  )
}

const MemoizedImageViewerProvider = memo(
  ImageLoaderProvider,
)

export default MemoizedImageViewerProvider
