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

// A thumbnail for the in-pane gallery. Unlike `Image` (which moves the loader's
// single per-path DOM node into a canvas and fits it by mutating its
// width/height), this renders a plain `<img>` off the cached blob URL with
// `object-fit: contain`. That matters because the same image can be shown as a
// thumbnail here while it's full-size in another column — sharing the canvas's
// DOM node scrambled both. Any number of `<img>` copies coexist safely.
const thumbnailStyles = css`
	align-items: center;
	display: flex;
	height: 100%;
	justify-content: center;
	overflow: hidden;
	position: absolute;
	width: 100%;
`

const imageStyles = css`
	height: 100%;
	object-fit: contain;
	width: 100%;
`

const propTypes = {
  fileName: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
}

const PaneThumbnail = ({ fileName, filePath }) => {
  const containerRef = useRef()

  const [isVisible, setIsVisible] = useState(false)

  const { updateImageVisibility } = useContext(
    ImageLoaderContext,
  )

  const { fileBlobUrl } = useStateSelector(
    ({ downloadedFiles }) => ({
      fileBlobUrl: downloadedFiles[filePath],
    }),
    [filePath],
  )

  // Lazy-load: only enqueue the download once the tile scrolls into view.
  useEffect(() => {
    const intersectionObserver = new IntersectionObserver(
      ([intersectionObserverEntry]) => {
        setIsVisible(
          intersectionObserverEntry.isIntersecting,
        )
      },
    )

    intersectionObserver.observe(containerRef.current)

    return () => {
      intersectionObserver.disconnect()
    }
  }, [])

  // Visibility drives the loader's priority queue (same channel `Image` uses).
  useEffect(() => {
    updateImageVisibility({ filePath, isVisible })

    return () => {
      updateImageVisibility({ filePath, isVisible: false })
    }
  }, [filePath, isVisible, updateImageVisibility])

  return (
    <div css={thumbnailStyles} ref={containerRef}>
      {fileBlobUrl && (
        <img
          alt={fileName}
          css={imageStyles}
          src={fileBlobUrl}
        />
      )}
    </div>
  )
}

PaneThumbnail.propTypes = propTypes

const MemoizedPaneThumbnail = memo(PaneThumbnail)

export default MemoizedPaneThumbnail
