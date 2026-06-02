import { useEffect, useState } from "react"
import { from } from "rxjs"
import { filter, map, toArray } from "rxjs/operators"

import compareNaturalStrings from "./compareNaturalStrings"

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
        map(({ fileName, filePath }) => ({
          name: fileName,
          path: filePath,
        })),
        toArray(),
        map((unsortedImageFiles) =>
          unsortedImageFiles
            .slice()
            .sort((firstImage, secondImage) =>
              compareNaturalStrings(
                firstImage.name,
                secondImage.name,
              ),
            ),
        ),
      )
      .subscribe(setImageFiles)

    return () => {
      subscription.unsubscribe()
    }
  }, [directoryContents])

  return imageFiles
}

export default useImageFiles
