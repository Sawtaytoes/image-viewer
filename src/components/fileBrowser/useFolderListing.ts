import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import type { DirectoryEntry, ImageFile } from "../../types"
import SettingsContext from "../settings/SettingsContext"
import {
  getFolderSortOrder,
  sortOrders,
} from "../settings/sortOrders"
import useDirectories from "./useDirectories"
import useImageFiles from "./useImageFiles"

const initialDirectoryContents: DirectoryEntry[] = []
const initialAddedPaths: ReadonlySet<string> = new Set()

export interface FolderListing {
  directories: ImageFile[]
  imageFiles: ImageFile[]
  isLoading: boolean
  addedPaths: ReadonlySet<string>
  refresh: () => void
}

const useFolderListing = (
  folderPath = "",
  {
    isWatchingForChanges = false,
  }: { isWatchingForChanges?: boolean } = {},
): FolderListing => {
  const { sortOrdersByFolder } = useContext(SettingsContext)
  const hasModifiedTimeSort =
    getFolderSortOrder(sortOrdersByFolder, folderPath) ===
    sortOrders.modifiedDesc
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(
    () => setRevision((value) => value + 1),
    [],
  )
  const [listing, setListing] = useState<{
    path: string
    contents: DirectoryEntry[]
    addedPaths: ReadonlySet<string>
    hasLoaded: boolean
  }>({
    path: folderPath,
    contents: initialDirectoryContents,
    addedPaths: initialAddedPaths,
    hasLoaded: false,
  })
  const [isLoading, setIsLoading] = useState(
    Boolean(folderPath),
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision explicitly requests a fresh read of the same folder.
  useEffect(() => {
    let isCancelled = false
    let isReading = false
    let hasPendingRead = false

    setListing((previous) =>
      previous.path === folderPath
        ? previous
        : {
            path: folderPath,
            contents: initialDirectoryContents,
            addedPaths: initialAddedPaths,
            hasLoaded: false,
          },
    )

    // Serialize reads: a change during a slow read schedules one more read.
    // Navigation cancels the old effect, so a late result cannot replace it.
    const read = async () => {
      if (isReading) {
        hasPendingRead = true
        return
      }
      if (!folderPath || isCancelled) return
      isReading = true
      try {
        const contents = await window.api.readDirectory(
          folderPath,
          { withModifiedTime: hasModifiedTimeSort },
        )
        if (!isCancelled) {
          setListing((previous) => {
            if (
              previous.path === folderPath &&
              previous.hasLoaded &&
              JSON.stringify(previous.contents) ===
                JSON.stringify(contents)
            )
              return previous
            const knownPaths = new Set(
              previous.contents.map(
                (entry) => entry.filePath,
              ),
            )
            const addedPaths = new Set<string>()
            for (const entry of contents) {
              if (
                previous.path === folderPath &&
                previous.hasLoaded &&
                (previous.addedPaths.has(entry.filePath) ||
                  !knownPaths.has(entry.filePath))
              )
                addedPaths.add(entry.filePath)
            }
            return {
              path: folderPath,
              contents,
              addedPaths,
              hasLoaded: true,
            }
          })
        }
      } catch {
        // Keep the last successful listing through a temporary disconnect.
      } finally {
        isReading = false
        if (!isCancelled) {
          setIsLoading(false)
          if (hasPendingRead) {
            hasPendingRead = false
            void read()
          }
        }
      }
    }

    setIsLoading(Boolean(folderPath))
    // Subscribe before the first read so additions during startup are not lost.
    const stopWatching =
      isWatchingForChanges && folderPath
        ? window.api.watchDirectory(
            folderPath,
            () => void read(),
          )
        : undefined
    void read()
    // fs.watch is advisory and can miss network-share changes or stop after a
    // disconnect. A bounded reconciliation also covers those cases.
    const timer =
      isWatchingForChanges && folderPath
        ? window.setInterval(() => {
            if (!isReading) void read()
          }, 3000)
        : undefined
    return () => {
      isCancelled = true
      stopWatching?.()
      window.clearInterval(timer)
    }
  }, [
    folderPath,
    hasModifiedTimeSort,
    isWatchingForChanges,
    revision,
  ])

  const contents =
    listing.path === folderPath
      ? listing.contents
      : initialDirectoryContents
  const directories = useDirectories(contents, folderPath)
  const imageFiles = useImageFiles(contents, folderPath)
  return {
    directories,
    imageFiles,
    isLoading,
    addedPaths:
      listing.path === folderPath
        ? listing.addedPaths
        : initialAddedPaths,
    refresh,
  }
}

export default useFolderListing
