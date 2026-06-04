import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
} from "react"
import {
  createStateObservable,
  dispatchReduxAction,
  reduxObservable$,
} from "./createdReduxObservable"
import ImageLoaderContext from "./ImageLoaderContext"
import {
  addFilePath,
  releaseFilePath,
  retainFilePath,
} from "./imageLoaderActions"

const propTypes = {
  children: PropTypes.node.isRequired,
}

const ImageLoaderProvider = ({ children }) => {
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
  const retainImage = useCallback(({ filePath }) => {
    dispatchReduxAction(
      retainFilePath({
        filePath,
      }),
    )
  }, [])

  const releaseImage = useCallback(({ filePath }) => {
    dispatchReduxAction(
      releaseFilePath({
        filePath,
      }),
    )
  }, [])

  const updateImageVisibility = useCallback(
    ({ filePath, isVisible }) => {
      dispatchReduxAction(
        addFilePath({
          filePath,
          isVisible,
        }),
      )
    },
    [],
  )

  const imageLoaderProviderValue = useMemo(
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

ImageLoaderProvider.propTypes = propTypes

const MemoizedImageViewerProvider = memo(
  ImageLoaderProvider,
)

export default MemoizedImageViewerProvider
