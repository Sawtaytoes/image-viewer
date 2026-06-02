import PropTypes from "prop-types"
import { memo, useCallback, useMemo, useState } from "react"

import ImageViewerContext from "./ImageViewerContext"

// Node/Electron access goes through the preload bridge. See
// docs/research/0002-electron-security-model.md.
const filePathArg = window.api.cliFilePath

const initialImageFile =
  filePathArg && window.api.statPath(filePathArg).isFile
    ? {
        name: window.api.path.basename(filePathArg),
        path: filePathArg,
      }
    : {}

const propTypes = {
  children: PropTypes.node.isRequired,
}

const ImageViewerProvider = ({ children }) => {
  const [imageFile, setImageFile] = useState(
    initialImageFile,
  )

  const leaveImageViewer = useCallback(() => {
    setImageFile({})
  }, [])

  const imageViewerProviderValue = useMemo(
    () => ({
      imageFileName: imageFile.name,
      imageFilePath: imageFile.path,
      leaveImageViewer,
      setImageFile,
    }),
    [imageFile, leaveImageViewer],
  )

  return (
    <ImageViewerContext.Provider
      value={imageViewerProviderValue}
    >
      {children}
    </ImageViewerContext.Provider>
  )
}

ImageViewerProvider.propTypes = propTypes

const MemoizedImageViewerProvider = memo(
  ImageViewerProvider,
)

export default MemoizedImageViewerProvider
