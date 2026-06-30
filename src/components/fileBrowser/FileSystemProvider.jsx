import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import FileSystemContext from "./FileSystemContext"
import useFolderListing from "./useFolderListing"

// All Node/Electron access goes through the preload bridge. See
// docs/research/0002-electron-security-model.md.
const pathApi = window.api.path

// The drive list shown at the root (empty filePath). Mirrors what
// `useDirectories` would produce for drive entries, minus a folder to list.
const driveDirectories = window.api
  .getWindowsDrives()
  .map((driveLetter) => ({
    name: driveLetter,
    path: driveLetter,
  }))

// Resolved in the main process from the launch path or the configured default
// directory (IMAGE_VIEWER_DEFAULT_DIRECTORY). Empty string ⇒ show the drive list.
const filePathArg = window.api.cliFilePath

const initialFilePath =
  new URLSearchParams(window.location.search).get(
    "filePath",
  ) ||
  (filePathArg &&
    pathApi.resolve(
      window.api.statPath(filePathArg).isDirectory
        ? filePathArg
        : pathApi.dirname(filePathArg),
    )) ||
  ""

const propTypes = {
  children: PropTypes.node.isRequired,
}

const FileSystemProvider = ({ children }) => {
  const [filePath, setFilePath] = useState(initialFilePath)

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(
      window.location.search,
    )

    urlSearchParams.set("filePath", filePath)

    window.history.replaceState(
      null,
      "",
      `?${urlSearchParams}`,
    )
  }, [filePath])

  const isRootFilePath = useMemo(
    () => !filePath || Object.is(filePath, pathApi.sep),
    [filePath],
  )

  const navigateUpFolderTree = useCallback(() => {
    if (isRootFilePath) {
      return
    }

    const nextFilePath = pathApi.resolve(
      pathApi.join(filePath, ".."),
    )

    if (filePath === nextFilePath) {
      setFilePath("")
    } else {
      setFilePath(nextFilePath)
    }
  }, [filePath, isRootFilePath])

  const {
    directories: listedDirectories,
    imageFiles,
    isLoading,
  } = useFolderListing(filePath)

  // At the root there is no folder to list, so surface the drives instead.
  const directories = filePath
    ? listedDirectories
    : driveDirectories

  const filePathProviderValue = useMemo(
    () => ({
      directories,
      filePath,
      imageFiles,
      isLoading,
      isRootFilePath,
      navigateUpFolderTree,
      setFilePath,
    }),
    [
      directories,
      filePath,
      imageFiles,
      isLoading,
      isRootFilePath,
      navigateUpFolderTree,
    ],
  )

  return (
    <FileSystemContext.Provider
      value={filePathProviderValue}
    >
      {children}
    </FileSystemContext.Provider>
  )
}

FileSystemProvider.propTypes = propTypes

const MemoizedFileSystemProvider = memo(FileSystemProvider)

export default MemoizedFileSystemProvider
