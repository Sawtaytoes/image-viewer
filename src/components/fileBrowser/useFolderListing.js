import { useEffect, useState } from "react"
import { from } from "rxjs"

import useDirectories from "./useDirectories"
import useImageFiles from "./useImageFiles"

// Consolidates the `readDirectory` subscription + derive logic that
// `FileSystemProvider` and `Directory` each hand-rolled. Each caller owns its
// own listing keyed by `folderPath`, so a pane can list its folder
// independently of the single global current folder.
const initialDirectoryContents = []

const useFolderListing = (folderPath) => {
  const [directoryContents, setDirectoryContents] =
    useState(initialDirectoryContents)

  // Tracks whether the read for the *current* `folderPath` is still in flight.
  // Without this the previous folder's contents linger on screen until the new
  // read resolves — in a slow, non-virtualized pane gallery that stale window
  // can last seconds and read as "stuck on the wrong folder".
  const [isLoading, setIsLoading] = useState(
    Boolean(folderPath),
  )

  useEffect(() => {
    if (!folderPath) {
      setDirectoryContents(initialDirectoryContents)
      setIsLoading(false)

      return undefined
    }

    // Drop the prior folder's listing immediately so navigation never paints
    // stale tiles, and flag the new read as loading until it lands.
    setDirectoryContents(initialDirectoryContents)
    setIsLoading(true)

    const subscription = from(
      window.api.readDirectory(folderPath),
    ).subscribe({
      next: (contents) => {
        setDirectoryContents(contents)
      },
      complete: () => {
        setIsLoading(false)
      },
      error: () => {
        setIsLoading(false)
      },
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [folderPath])

  const directories = useDirectories(
    directoryContents,
    folderPath,
  )

  const imageFiles = useImageFiles(
    directoryContents,
    folderPath,
  )

  return {
    directories,
    imageFiles,
    isLoading,
  }
}

export default useFolderListing
