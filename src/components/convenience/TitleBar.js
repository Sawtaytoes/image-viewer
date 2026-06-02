import { useContext, useEffect } from "react"

import FileSystemContext from "../fileBrowser/FileSystemContext"
import ImageViewerContext from "../imageViewer/ImageViewerContext"

const pathApi = window.api.path

const TitleBar = () => {
  const { filePath } = useContext(FileSystemContext)

  const { imageFilePath } = useContext(ImageViewerContext)

  useEffect(() => {
    const folderName = pathApi.basename(filePath)
    const parentPath = pathApi.dirname(filePath)

    const leadingText = imageFilePath
      ? pathApi.join(
          folderName,
          pathApi.basename(imageFilePath),
        )
      : folderName

    document.title = `${leadingText} | ${parentPath} | Image Viewer`
  }, [filePath, imageFilePath])

  return null
}

export default TitleBar
