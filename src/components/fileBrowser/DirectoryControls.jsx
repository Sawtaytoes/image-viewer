import { css } from "@emotion/react"
import {
  memo,
  useCallback,
  useContext,
  useState,
} from "react"

import ArrowUpwardIcon from "../icons/ArrowUpwardIcon"
import DeleteForeverIcon from "../icons/DeleteForeverIcon"
import DeleteFileModal from "../toolkit/DeleteFileModal"
import FileSystemContext from "./FileSystemContext"

const directoryControlsStyles = css`
	align-items: center;
	display: flex;
`

const directoryNameStyles = css`
	flex: 1 1 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 400;
	user-select: none;
`

const navigationStyles = css`
	padding: 4px;
`

const DirectoryControls = () => {
  const { filePath, isRootFilePath, navigateUpFolderTree } =
    useContext(FileSystemContext)

  const [
    isDeleteFileModalVisible,
    setIsDeleteFileModalVisible,
  ] = useState(false)

  const closeDeleteFileModal = useCallback(() => {
    setIsDeleteFileModalVisible(false)
  }, [])

  const openDeleteFileModal = useCallback(() => {
    setIsDeleteFileModalVisible(true)
  }, [])

  const deleteFolder = useCallback(() => {
    window.api
      .deleteFilePath({ filePath, isDirectory: true })
      .then(navigateUpFolderTree)
      .then(closeDeleteFileModal)
  }, [closeDeleteFileModal, filePath, navigateUpFolderTree])

  return (
    <div css={directoryControlsStyles}>
      {!isRootFilePath && (
        <div
          css={navigationStyles}
          onClick={navigateUpFolderTree}
          title="^ Go up a Directory"
        >
          <ArrowUpwardIcon />
        </div>
      )}

      <div
        css={directoryNameStyles}
        onClick={navigateUpFolderTree}
      >
        {filePath}
      </div>

      <div onClick={openDeleteFileModal}>
        <DeleteForeverIcon />
      </div>

      <DeleteFileModal
        isVisible={isDeleteFileModalVisible}
        onClose={closeDeleteFileModal}
        onConfirm={deleteFolder}
      />
    </div>
  )
}

const MemoizedDirectoryControls = memo(DirectoryControls)

export default MemoizedDirectoryControls
