import { useCallback, useEffect, useState } from "react"
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

  // The read itself, shared by the mount effect and `refresh()`. `refresh`
  // re-reads the *same* folder after its contents change on disk (e.g. deleting
  // an image from a pane) — `folderPath` alone wouldn't change, so the effect
  // can't retrigger on its own. `from(promise)` completes after one emit, so a
  // refresh's subscription self-disposes; the returned teardown is only used
  // when the effect re-runs or unmounts.
  const loadListing = useCallback(() => {
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

  useEffect(() => loadListing(), [loadListing])

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
    refresh: loadListing,
  }
}

export default useFolderListing
