import { ProgressBar } from "@charcuterie/ui"
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
      {/* Was a bare `<progress max="100">` with the number as its child. The
          child text is a *fallback* — browsers that implement `<progress>`
          never render it — so the readout it looked like it had was invisible
          in every browser this app has ever run in, and the element had no
          accessible name at all: a screen reader got "progress bar, 40%" with
          no statement of what was loading.

          `isValueShown` is the readout the old markup was reaching for, and it
          is what `ui-needs-visible-feedback` asks for
          (`docs/decisions/2026-06-03-ui-needs-visible-feedback.md`). The label
          is the accessible name and stays visually hidden — the filename is
          already under the cursor as the image's own `title`, and printing it
          twice over a half-loaded photo is noise.

          The width is bounded here rather than left to the component: its root
          is `flex flex-col` with no width of its own, so inside this centring
          flex row it would otherwise shrink to its content. */}
      {downloadedPercent !== 100 && (
        <ProgressBar
          className="w-1/2 max-w-[420px]"
          isValueShown
          label={`Loading ${fileName}`}
          value={downloadedPercent}
        />
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
