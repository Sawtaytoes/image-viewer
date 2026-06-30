import { useContext, useEffect, useState } from "react"
import { from } from "rxjs"
import { filter, map, toArray } from "rxjs/operators"

import SettingsContext from "../settings/SettingsContext"
import { getFolderSortOrder } from "../settings/sortOrders"
import sortDirectoryEntries from "./sortDirectoryEntries"

const validImageExtensions = [
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  // HEIC/HEIF: listed here so iPhone photos appear; Chromium can't decode them,
  // so main transcodes their bytes to JPEG in readImageData (see preload.js).
  ".heic",
  ".heif",
  ".ico",
  ".cur",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".pjpeg",
  ".pjp",
  ".png",
  ".svg",
  ".webp",
]

const useImageFiles = (directoryContents, folderPath) => {
  const { sortOrdersByFolder } = useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    folderPath,
  )

  const [imageFiles, setImageFiles] = useState([])

  useEffect(() => {
    const subscription = from(directoryContents)
      .pipe(
        filter(({ isFile }) => isFile),
        filter(({ fileName }) =>
          validImageExtensions.includes(
            window.api.path.extname(fileName).toLowerCase(),
          ),
        ),
        map(({ fileName, filePath, modifiedTime }) => ({
          modifiedTime,
          name: fileName,
          path: filePath,
        })),
        toArray(),
        map((unsortedImageFiles) =>
          sortDirectoryEntries(
            unsortedImageFiles,
            sortOrder,
          ),
        ),
      )
      .subscribe(setImageFiles)

    return () => {
      subscription.unsubscribe()
    }
  }, [directoryContents, sortOrder])

  return imageFiles
}

export default useImageFiles
