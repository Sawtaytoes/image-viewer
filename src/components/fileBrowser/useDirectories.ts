import { useContext, useEffect, useState } from "react"
import { from } from "rxjs"
import { filter, map, toArray } from "rxjs/operators"

import type { DirectoryEntry, ImageFile } from "../../types"
import SettingsContext from "../settings/SettingsContext"
import { getFolderSortOrder } from "../settings/sortOrders"
import sortDirectoryEntries from "./sortDirectoryEntries"

const systemDirectories = [
  "$recycle.bin",
  "$winreagent",
  "ai_recyclebin",
  "config.msi",
  "recovery",
  "system volume information",
  "windows",
]

const initialDirectories: ImageFile[] = []

const useDirectories = (
  directoryContents: readonly DirectoryEntry[],
  folderPath = "",
): ImageFile[] => {
  const { sortOrdersByFolder } = useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    folderPath,
  )

  const [directories, setDirectories] = useState<
    ImageFile[]
  >(initialDirectories)

  useEffect(() => {
    const subscriber = from(directoryContents)
      .pipe(
        filter(({ isDirectory }) => isDirectory),
        filter(
          ({ fileName }) =>
            !systemDirectories.includes(
              fileName.toLowerCase(),
            ),
        ),
        map(({ fileName, filePath, modifiedTime }) => ({
          modifiedTime,
          name: fileName,
          path: filePath,
        })),
        toArray(),
        map((unsortedDirectories) =>
          sortDirectoryEntries(
            unsortedDirectories,
            sortOrder,
          ),
        ),
      )
      .subscribe(setDirectories)

    return () => {
      subscriber.unsubscribe()
    }
  }, [directoryContents, sortOrder])

  return directories
}

export default useDirectories
