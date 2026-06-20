import { useEffect, useState } from "react"

// A folder's representative image, found lazily once its tile is in view (via
// `isEnabled`). The result doubles as the gallery test: `image` is null when the
// folder holds no images at any depth, so it isn't a gallery and can't be
// queued. `isResolved` guards selection until the probe finishes — "still
// scanning" must not be mistaken for "not a gallery".
//
// This replaces the per-tile `useFolderListing` (which ran a full
// `readDirectory` — a stat per entry — just to grab the first image). Gating on
// visibility plus the early-exiting `findFirstImage` is what keeps a
// many-folder, non-virtualized pane gallery from flooding the main process.
const initialThumbnail = { image: null, isResolved: false }

const useFolderThumbnail = (folderPath, isEnabled) => {
  const [thumbnail, setThumbnail] = useState(
    initialThumbnail,
  )

  useEffect(() => {
    if (!isEnabled || !folderPath) {
      return undefined
    }

    let isCancelled = false

    Promise.resolve(window.api.findFirstImage(folderPath))
      .then((image) => {
        if (!isCancelled) {
          setThumbnail({ image, isResolved: true })
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setThumbnail({ image: null, isResolved: true })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [folderPath, isEnabled])

  return thumbnail
}

export default useFolderThumbnail
