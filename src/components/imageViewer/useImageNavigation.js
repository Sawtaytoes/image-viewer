import { useCallback, useContext, useMemo } from "react"

import FileSystemContext from "../fileBrowser/FileSystemContext"
import ImageViewerContext from "./ImageViewerContext"
import usePaneNavigation from "./usePaneNavigation"

// Thin adapter that maps the legacy single-image overlay onto the generic
// pane navigation: the "current index" comes from `imageFilePath`'s position
// in the global folder, and moving the index sets the viewer's image file.
const useImageNavigation = () => {
  const { imageFiles } = useContext(FileSystemContext)

  const { imageFilePath, setImageFile } = useContext(
    ImageViewerContext,
  )

  const currentIndex = useMemo(
    () =>
      imageFiles.findIndex(
        ({ path }) => imageFilePath === path,
      ),
    [imageFilePath, imageFiles],
  )

  const setCurrentIndex = useCallback(
    (index) => {
      setImageFile(imageFiles[index])
    },
    [imageFiles, setImageFile],
  )

  return usePaneNavigation({
    currentIndex,
    imageFiles,
    setCurrentIndex,
  })
}

export default useImageNavigation
