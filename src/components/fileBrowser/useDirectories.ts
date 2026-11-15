import { useContext, useMemo } from "react"

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

const useDirectories = (
  directoryContents: readonly DirectoryEntry[],
  folderPath = "",
): ImageFile[] => {
  const { sortOrdersByFolder } = useContext(SettingsContext)

  const sortOrder = getFolderSortOrder(
    sortOrdersByFolder,
    folderPath,
  )

  // Derive synchronously so a folder change never exposes the previous
  // folder's files for one render (which could overwrite a saved pane index).
  return useMemo(
    () =>
      sortDirectoryEntries(
        directoryContents
          .filter((entry) => entry.isDirectory)
          .filter(
            (entry) =>
              !systemDirectories.includes(
                entry.fileName.toLowerCase(),
              ),
          )
          .map(({ fileName, filePath, modifiedTime }) => ({
            modifiedTime,
            name: fileName,
            path: filePath,
          })),
        sortOrder,
      ),
    [directoryContents, sortOrder],
  )
}

export default useDirectories
