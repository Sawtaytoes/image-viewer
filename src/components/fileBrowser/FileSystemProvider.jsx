import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { from } from "rxjs"

import FileSystemContext from "./FileSystemContext"
import useDirectories from "./useDirectories"
import useImageFiles from "./useImageFiles"

// All Node/Electron access goes through the preload bridge. See
// docs/research/0002-electron-security-model.md.
const pathApi = window.api.path

const windowsDrivePaths = window.api
  .getWindowsDrives()
  .map((driveLetter) => ({
    fileName: driveLetter,
    filePath: driveLetter,
    isDirectory: true,
    isFile: false,
  }))

const filePathArg =
  window.api.cliFilePath === "."
    ? // TEMP hack until some sort of usable `.env` files are added.
      "D:\\Pictures"
    : window.api.cliFilePath

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

const initialDirectoryContents = []

const propTypes = {
  children: PropTypes.node.isRequired,
}

const FileSystemProvider = ({ children }) => {
  const [filePath, setFilePath] = useState(initialFilePath)

  const [directoryContents, setDirectoryContents] =
    useState(initialDirectoryContents)

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

  useEffect(() => {
    if (!filePath) {
      if (windowsDrivePaths) {
        setDirectoryContents(windowsDrivePaths)
      } else {
        setFilePath(pathApi.sep)
      }
    }
  }, [filePath])

  useEffect(() => {
    if (!filePath) {
      return
    }

    const subscription = from(
      window.api.readDirectory(filePath),
    ).subscribe(setDirectoryContents)

    return () => {
      subscription.unsubscribe()
    }
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

  const directories = useDirectories(directoryContents)

  const imageFiles = useImageFiles(directoryContents)

  const filePathProviderValue = useMemo(
    () => ({
      directories,
      filePath,
      imageFiles,
      isRootFilePath,
      navigateUpFolderTree,
      setFilePath,
    }),
    [
      directories,
      filePath,
      imageFiles,
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
