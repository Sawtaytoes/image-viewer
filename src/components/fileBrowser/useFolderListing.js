import { useContext, useEffect, useState } from "react"
import { from } from "rxjs"

import SettingsContext from "../settings/SettingsContext"
import {
  getFolderSortOrder,
  sortOrders,
} from "../settings/sortOrders"
import useDirectories from "./useDirectories"
import useImageFiles from "./useImageFiles"

// Consolidates the `readDirectory` subscription + derive logic that
// `FileSystemProvider` and `Directory` each hand-rolled. Each caller owns its
// own listing keyed by `folderPath`, so a pane can list its folder
// independently of the single global current folder.
const initialDirectoryContents = []

const useFolderListing = (folderPath) => {
  const { sortOrdersByFolder } = useContext(SettingsContext)

  // Only the date-modified sort needs each entry's mtime, and fetching it costs
  // a `stat` per file that blocks the whole listing (see `readDirectory` in the
  // preload). Skip it for the default name sort so the listing loads instantly
  // and images fill in afterward, the way it did before date sort existed.
  const needsModifiedTime =
    getFolderSortOrder(sortOrdersByFolder, folderPath) ===
    sortOrders.modifiedDesc

  const [directoryContents, setDirectoryContents] =
    useState(initialDirectoryContents)

  useEffect(() => {
    if (!folderPath) {
      setDirectoryContents(initialDirectoryContents)

      return undefined
    }

    const subscription = from(
      window.api.readDirectory(folderPath, {
        withModifiedTime: needsModifiedTime,
      }),
    ).subscribe(setDirectoryContents)

    return () => {
      subscription.unsubscribe()
    }
  }, [folderPath, needsModifiedTime])

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
