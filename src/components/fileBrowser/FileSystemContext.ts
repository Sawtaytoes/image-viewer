import { createContext } from "react"

import type { ImageFile } from "../../types"

// The current folder and everything derived from listing it. `directories` is
// the drive list at the root (empty `filePath`), the folder's subfolders
// otherwise; both use the `ImageFile` shape because a folder tile needs exactly
// the same name/path/mtime a file tile does.
export interface FileSystemContextValue {
  directories: ImageFile[]
  filePath: string
  imageFiles: ImageFile[]
  isLoading: boolean
  isRootFilePath: boolean
  navigateUpFolderTree: () => void
  setFilePath: (filePath: string) => void
}

// A real default rather than `createContext()`'s implicit `undefined`: every
// consumer destructures the value, so an undefined default would make the type
// dishonest at every call site (and force a null check that can never fire —
// `App` always renders the provider).
const FileSystemContext =
  createContext<FileSystemContextValue>({
    directories: [],
    filePath: "",
    imageFiles: [],
    isLoading: false,
    isRootFilePath: true,
    navigateUpFolderTree: () => {},
    setFilePath: () => {},
  })

export default FileSystemContext
