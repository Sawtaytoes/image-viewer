import {
  memo,
  useCallback,
  useContext,
  useRef,
} from "react"

import useKeyboardControls from "../convenience/useKeyboardControls"
import Image from "../imageViewer/Image"
import ImageViewerContext from "../imageViewer/ImageViewerContext"

interface ImageFileProps {
  fileName: string
  filePath: string
}

const ImageFile = ({
  fileName,
  filePath,
}: ImageFileProps) => {
  const isCtrlKeyHeldRef = useRef(false)

  const { setImageFile } = useContext(ImageViewerContext)

  useKeyboardControls((event) => {
    isCtrlKeyHeldRef.current = event.ctrlKey
  })

  const goToImage = useCallback(() => {
    if (isCtrlKeyHeldRef.current) {
      window.api.createNewWindow({ filePath })
    } else {
      setImageFile({
        name: fileName,
        path: filePath,
      })
    }
  }, [fileName, filePath, setImageFile])

  // A real `<button>`, so a tile is in the accessibility tree with a role and
  // Enter or Space on it does what a tap does. Tailwind's preflight strips the
  // button's own background, border and padding, so it paints as the `<div>`
  // it replaced. `Image` draws its `<img>` with no `alt`, so the file name is
  // the button's accessible name.
  return (
    <button
      aria-label={fileName}
      className="relative flex w-full cursor-pointer items-center justify-center pb-[100%]"
      data-tap-surface
      onClick={goToImage}
      type="button"
    >
      <div className="absolute top-0 left-0 h-full w-full">
        <Image
          fileName={fileName}
          filePath={filePath}
          hasVisibilityDetection
        />
      </div>
    </button>
  )
}

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
