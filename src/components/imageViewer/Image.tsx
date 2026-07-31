import {
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import useStateSelector from "../imageLoader/useStateSelector"

interface ImageProps {
  fileName: string
  filePath: string
  hasVisibilityDetection?: boolean
}

const Image = ({
  fileName,
  filePath,
  hasVisibilityDetection = false,
}: ImageProps) => {
  const [isVisible, setIsVisible] = useState(false)

  const animationFrameIdRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const {
    releaseImage,
    retainImage,
    updateImageVisibility,
  } = useContext(ImageLoaderContext)

  const { imageDomElement, percentDownloaded } =
    useStateSelector(
      ({
        downloadedFiles,
        downloadPercentages,
        imageDomElements,
      }) => ({
        fileBlobUrl: downloadedFiles[filePath],
        imageDomElement: imageDomElements[filePath],
        percentDownloaded: downloadPercentages[filePath],
      }),
      [filePath],
    )

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const intersectionObserver = new IntersectionObserver(
      ([intersectionObserverEntry]) => {
        setIsVisible(
          hasVisibilityDetection
            ? intersectionObserverEntry.isVisible
            : intersectionObserverEntry.isIntersecting,
        )
      },
      {
        delay: 100,
        trackVisibility: true,
      },
    )

    intersectionObserver.observe(canvas)

    return () => {
      intersectionObserver.disconnect()
    }
  }, [hasVisibilityDetection])

  useEffect(() => {
    updateImageVisibility({
      filePath,
      isVisible,
    })

    return () => {
      if (!hasVisibilityDetection) {
        updateImageVisibility({
          filePath,
          isVisible: !isVisible,
        })
      }
    }
  }, [
    filePath,
    hasVisibilityDetection,
    isVisible,
    updateImageVisibility,
  ])

  // The full-screen viewer is a standalone holder: it retains its path so the
  // blob survives even if no folder pane lists it (and, with side-by-side
  // panes, so closing one viewer doesn't evict the image another still shows).
  // Gallery thumbnails (`hasVisibilityDetection`) skip this — their folder pane
  // owns the hold, and mounting/unmounting on scroll must not churn the cache.
  useEffect(() => {
    if (hasVisibilityDetection) {
      return undefined
    }

    retainImage({ filePath })

    return () => {
      releaseImage({ filePath })
    }
  }, [
    filePath,
    hasVisibilityDetection,
    releaseImage,
    retainImage,
  ])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!imageDomElement || !canvas?.parentElement) {
      return undefined
    }

    const loadCanvasWithImage = () => {
      // Use the immutable intrinsic dimensions. The rendered `width`/`height`
      // are overwritten by `setAttribute` below, so reading them here would
      // fit against the previous fit's size — compounding rounding every
      // resize until the aspect ratio drifts and never recovers.
      const { naturalHeight, naturalWidth } =
        imageDomElement

      const isHeightRestricted =
        (naturalHeight / naturalWidth) *
          canvas.clientWidth >
        canvas.clientHeight

      const canvasImageWidth = isHeightRestricted
        ? (naturalWidth / naturalHeight) *
          canvas.clientHeight
        : canvas.clientWidth

      const canvasImageHeight = isHeightRestricted
        ? canvas.clientHeight
        : (naturalHeight / naturalWidth) *
          canvas.clientWidth

      imageDomElement.setAttribute(
        "width",
        String(canvasImageWidth),
      )

      imageDomElement.setAttribute(
        "height",
        String(canvasImageHeight),
      )

      canvas.replaceChildren(
        Object.is(imageDomElement.parentElement, canvas)
          ? imageDomElement
          : imageDomElement.cloneNode(true),
      )
    }

    const throttleCanvasLoading = () => {
      if (animationFrameIdRef.current) {
        return
      }

      animationFrameIdRef.current =
        window.requestAnimationFrame(() => {
          animationFrameIdRef.current = null

          loadCanvasWithImage()
        })
    }

    const resizeObserver = new ResizeObserver(
      throttleCanvasLoading,
    )

    resizeObserver.observe(canvas.parentElement)

    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameIdRef.current,
        )
      }

      animationFrameIdRef.current = null

      resizeObserver.disconnect()
    }
  }, [imageDomElement])

  // The store publishes `number | null` and the subscription has not delivered
  // on the first render, so "no percentage yet" is two different absent values;
  // both mean 0% here.
  const downloadedPercent = percentDownloaded ?? 0

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {downloadedPercent !== 100 && (
        <progress max="100" value={downloadedPercent}>
          {downloadedPercent}
        </progress>
      )}

      <div
        className="absolute flex h-full w-full items-center justify-center"
        ref={canvasRef}
        title={fileName}
      />
    </div>
  )
}

const MemoizedImage = memo(Image)

export default MemoizedImage
