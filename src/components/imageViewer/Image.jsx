import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import useStateSelector from "../imageLoader/useStateSelector"

const imageContainerStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	position: relative;
	width: 100%;
`

const imageLoadingProgressStyles = css`
`

const imageCanvasStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	position: absolute;
	width: 100%;
`

const propTypes = {
  fileName: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  hasVisibilityDetection: PropTypes.bool,
}

const Image = ({
  fileName,
  filePath,
  hasVisibilityDetection = false,
}) => {
  const [isVisible, setIsVisible] = useState(false)

  const animationFrameIdRef = useRef()
  const canvasRef = useRef()

  const { updateImageVisibility } = useContext(
    ImageLoaderContext,
  )

  const { imageDomElement, percentDownloaded = 0 } =
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

    intersectionObserver.observe(canvasRef.current)

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

  useEffect(() => {
    if (!imageDomElement) {
      return
    }

    const loadCanvasWithImage = () => {
      if (!canvasRef.current) {
        return
      }

      // Use the immutable intrinsic dimensions. The rendered `width`/`height`
      // are overwritten by `setAttribute` below, so reading them here would
      // fit against the previous fit's size — compounding rounding every
      // resize until the aspect ratio drifts and never recovers.
      const { naturalHeight, naturalWidth } =
        imageDomElement

      const isHeightRestricted =
        (naturalHeight / naturalWidth) *
          canvasRef.current.clientWidth >
        canvasRef.current.clientHeight

      const canvasImageWidth = isHeightRestricted
        ? (naturalWidth / naturalHeight) *
          canvasRef.current.clientHeight
        : canvasRef.current.clientWidth

      const canvasImageHeight = isHeightRestricted
        ? canvasRef.current.clientHeight
        : (naturalHeight / naturalWidth) *
          canvasRef.current.clientWidth

      imageDomElement.setAttribute(
        "width",
        canvasImageWidth,
      )

      imageDomElement.setAttribute(
        "height",
        canvasImageHeight,
      )

      canvasRef.current.replaceChildren(
        Object.is(
          imageDomElement.parentElement,
          canvasRef.current,
        )
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

    resizeObserver.observe(canvasRef.current.parentElement)

    return () => {
      window.cancelAnimationFrame(
        animationFrameIdRef.current,
      )

      animationFrameIdRef.current = null

      resizeObserver.disconnect()
    }
  }, [imageDomElement])

  return (
    <div css={imageContainerStyles}>
      {percentDownloaded !== 100 && (
        <progress
          css={imageLoadingProgressStyles}
          max="100"
          value={percentDownloaded}
        >
          {percentDownloaded}
        </progress>
      )}

      <div
        css={imageCanvasStyles}
        ref={canvasRef}
        title={fileName}
      />
    </div>
  )
}

Image.propTypes = propTypes

const MemoizedImage = memo(Image)

export default MemoizedImage
