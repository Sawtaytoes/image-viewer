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

  return (
    <div
      className="relative flex w-full cursor-pointer items-center justify-center pb-[100%]"
      onClick={goToImage}
    >
      <div className="absolute top-0 left-0 h-full w-full">
        <Image
          fileName={fileName}
          filePath={filePath}
          hasVisibilityDetection
        />
      </div>
    </div>
  )
}

const MemoizedImageFile = memo(ImageFile)

export default MemoizedImageFile
