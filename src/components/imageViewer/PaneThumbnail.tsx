import {
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import useStateSelector from "../imageLoader/useStateSelector"

interface PaneThumbnailProps {
  fileName: string
  filePath: string
}

// A thumbnail for the in-pane gallery. Unlike `Image` (which moves the loader's
// single per-path DOM node into a canvas and fits it by mutating its
// width/height), this renders a plain `<img>` off the cached blob URL with
// `object-fit: contain`. That matters because the same image can be shown as a
// thumbnail here while it's full-size in another column — sharing the canvas's
// DOM node scrambled both. Any number of `<img>` copies coexist safely.
const PaneThumbnail = ({
  fileName,
  filePath,
}: PaneThumbnailProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

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
    const container = containerRef.current

    if (!container) {
      return undefined
    }

    const intersectionObserver = new IntersectionObserver(
      ([intersectionObserverEntry]) => {
        setIsVisible(
          intersectionObserverEntry.isIntersecting,
        )
      },
    )

    intersectionObserver.observe(container)

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
    <div
      className="absolute flex h-full w-full items-center justify-center overflow-hidden"
      ref={containerRef}
    >
      {fileBlobUrl && (
        <img
          alt={fileName}
          className="h-full w-full object-contain"
          src={fileBlobUrl}
        />
      )}
    </div>
  )
}

const MemoizedPaneThumbnail = memo(PaneThumbnail)

export default MemoizedPaneThumbnail
