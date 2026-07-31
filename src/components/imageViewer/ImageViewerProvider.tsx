import type { ReactNode } from "react"
import { memo, useCallback, useMemo, useState } from "react"
import type {
  ImageViewerContextValue,
  ViewerImageFile,
} from "./ImageViewerContext"
import ImageViewerContext from "./ImageViewerContext"

// Node/Electron access goes through the preload bridge. See
// docs/research/0002-electron-security-model.md.
const filePathArg = window.api.cliFilePath

const initialImageFile: ViewerImageFile =
  filePathArg && window.api.statPath(filePathArg).isFile
    ? {
        name: window.api.path.basename(filePathArg),
        path: filePathArg,
      }
    : {}

interface ImageViewerProviderProps {
  children: ReactNode
}

const ImageViewerProvider = ({
  children,
}: ImageViewerProviderProps) => {
  const [imageFile, setImageFile] =
    useState<ViewerImageFile>(initialImageFile)

  const leaveImageViewer = useCallback(() => {
    setImageFile({})
  }, [])

  const imageViewerProviderValue =
    useMemo<ImageViewerContextValue>(
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

const MemoizedImageViewerProvider = memo(
  ImageViewerProvider,
)

export default MemoizedImageViewerProvider
