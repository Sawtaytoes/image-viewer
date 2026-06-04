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

  useEffect(() => {
    if (!folderPath) {
      setDirectoryContents(initialDirectoryContents)

      return undefined
    }

    const subscription = from(
      window.api.readDirectory(folderPath),
    ).subscribe(setDirectoryContents)

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
  }
}

export default useFolderListing
