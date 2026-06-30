import { useEffect, useState } from "react"

// How many images a folder holds (at any depth), found lazily once its tile is
// in view (via `isEnabled`) so off-screen tiles never pay for the walk. Null
// until the count resolves, so a "0" badge never flashes before the real number.
// Kept separate from `useFolderThumbnail` on purpose: the thumbnail probe bails
// at the first image to stay cheap, while a count must visit the whole (bounded)
// subtree — folding them together would make every thumbnail pay the full walk.
const useFolderImageCount = (folderPath, isEnabled) => {
  const [count, setCount] = useState(null)

  useEffect(() => {
    if (!isEnabled || !folderPath) {
      return undefined
    }

    let isCancelled = false

    Promise.resolve(
      window.api.countFolderImages(folderPath),
    )
      .then((value) => {
        if (!isCancelled) {
          setCount(value)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCount(null)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [folderPath, isEnabled])

  return count
}

export default useFolderImageCount
