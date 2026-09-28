import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { from, type Subscription } from "rxjs"

import type { DirectoryEntry, ImageFile } from "../../types"
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
const initialDirectoryContents: DirectoryEntry[] = []

export interface FolderListing {
  directories: ImageFile[]
  imageFiles: ImageFile[]
  isLoading: boolean
  refresh: () => void
}

const useFolderListing = (
  folderPath = "",
  {
    isWatchingForChanges = false,
  }: {
    // Re-read the folder when its entries change on disk. The galleries opt
    // in; an open image pane does not, because a file landing earlier in the
    // sort order would move the image the reader is looking at.
    isWatchingForChanges?: boolean
  } = {},
): FolderListing => {
  const { sortOrdersByFolder } = useContext(SettingsContext)

  // Only the date-modified sort needs each entry's mtime, and fetching it costs
  // a `stat` per file that blocks the whole listing (see `readDirectory` in the
  // preload). Skip it for the default name sort so the listing loads instantly
  // and images fill in afterward, the way it did before date sort existed.
  const hasModifiedTimeSort =
    getFolderSortOrder(sortOrdersByFolder, folderPath) ===
    sortOrders.modifiedDesc

  const [directoryContents, setDirectoryContents] =
    useState<DirectoryEntry[]>(initialDirectoryContents)

  // Tracks whether the read for the *current* `folderPath` is still in flight.
  // Without this the previous folder's contents linger on screen until the new
  // read resolves — in a slow, non-virtualized pane gallery that stale window
  // can last seconds and read as "stuck on the wrong folder".
  const [isLoading, setIsLoading] = useState(
    Boolean(folderPath),
  )

  // The read itself, shared by the mount effect and `refresh()`. `refresh`
  // re-reads the *same* folder after its contents change on disk (e.g. deleting
  // an image from a pane) — `folderPath` alone wouldn't change, so the effect
  // can't retrigger on its own. `from(promise)` completes after one emit, so a
  // refresh's subscription self-disposes; the returned teardown is only used
  // when the effect re-runs or unmounts.
  const loadListing = useCallback(() => {
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
      window.api.readDirectory(folderPath, {
        withModifiedTime: hasModifiedTimeSort,
      }),
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
  }, [folderPath, hasModifiedTimeSort])

  useEffect(() => loadListing(), [loadListing])

  // A change on disk re-reads in place: the current tiles stay up until the
  // new listing lands, rather than blanking to a spinner the way navigation
  // does. A newer change supersedes a read still in flight.
  useEffect(() => {
    if (!isWatchingForChanges || !folderPath) {
      return undefined
    }

    let subscription: Subscription | undefined

    const stopWatching = window.api.watchDirectory(
      folderPath,
      () => {
        subscription?.unsubscribe()

        subscription = from(
          window.api.readDirectory(folderPath, {
            withModifiedTime: hasModifiedTimeSort,
          }),
        ).subscribe({
          next: (contents) => {
            setDirectoryContents(contents)
          },
          error: () => undefined,
        })
      },
    )

    return () => {
      stopWatching()
      subscription?.unsubscribe()
    }
  }, [
    folderPath,
    hasModifiedTimeSort,
    isWatchingForChanges,
  ])

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
    refresh: loadListing,
  }
}

export default useFolderListing
