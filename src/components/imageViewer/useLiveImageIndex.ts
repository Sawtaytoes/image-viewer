import { useEffect, useState } from "react"

import type { ImageFile } from "../../types"

// Keep the current path when a live listing inserts/removes earlier entries.
// Explicit index changes (keyboard, gallery, or queue assignment) take precedence.
const useLiveImageIndex = (
  folderPath: string | undefined,
  imageFiles: ImageFile[],
  requestedIndex: number,
  setCurrentIndex: (index: number) => void,
) => {
  const [position, setPosition] = useState({
    folderPath,
    imageFiles,
    requestedIndex,
    index: requestedIndex,
  })
  let index = position.index
  if (
    position.folderPath !== folderPath ||
    position.requestedIndex !== requestedIndex
  ) {
    index = requestedIndex
  } else if (position.imageFiles !== imageFiles) {
    const previousPath =
      position.imageFiles[position.index]?.path
    const nextIndex = previousPath
      ? imageFiles.findIndex(
          (image) => image.path === previousPath,
        )
      : -1
    index = nextIndex >= 0 ? nextIndex : position.index
  }
  if (imageFiles.length)
    index = Math.max(
      0,
      Math.min(index, imageFiles.length - 1),
    )
  if (
    position.folderPath !== folderPath ||
    position.imageFiles !== imageFiles ||
    position.requestedIndex !== requestedIndex ||
    position.index !== index
  ) {
    setPosition({
      folderPath,
      imageFiles,
      requestedIndex,
      index,
    })
  }
  useEffect(() => {
    if (imageFiles.length && index !== requestedIndex)
      setCurrentIndex(index)
  }, [
    imageFiles.length,
    index,
    requestedIndex,
    setCurrentIndex,
  ])
  return index
}

export default useLiveImageIndex
