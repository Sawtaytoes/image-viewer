import { useContext, useMemo } from "react"

import type { DirectoryEntry, ImageFile } from "../../types"
import SettingsContext from "../settings/SettingsContext"
import { getFolderSortOrder } from "../settings/sortOrders"
import sortDirectoryEntries from "./sortDirectoryEntries"

const validImageExtensions = [
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  // HEIC/HEIF: listed here so iPhone photos appear; Chromium can't decode them,
  // so main transcodes their bytes to JPEG in readImageData (see preload.ts).
  ".heic",
  ".heif",
  ".ico",
  ".cur",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".pjpeg",
  ".pjp",
  ".png",
  ".svg",
  ".webp",
]

const useImageFiles = (
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
          .filter((entry) => entry.isFile)
          .filter((entry) =>
            validImageExtensions.includes(
              window.api.path
                .extname(entry.fileName)
                .toLowerCase(),
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

export default useImageFiles
