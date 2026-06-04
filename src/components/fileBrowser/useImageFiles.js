import { useContext, useEffect, useState } from "react"
import { from } from "rxjs"
import { filter, map, toArray } from "rxjs/operators"

import SettingsContext from "../settings/SettingsContext"
import sortDirectoryEntries from "./sortDirectoryEntries"

const validImageExtensions = [
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
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

const useImageFiles = (directoryContents) => {
  const { sortOrder } = useContext(SettingsContext)

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
