import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded'
import DeleteForeverRoundedIcon from '@material-ui/icons/DeleteForeverRounded'
import { css } from '@emotion/core'
import { ipcRenderer } from 'electron'
import {
	memo,
	useCallback,
	useContext,
	useState,
} from 'react'

import DeleteFileModal from '../toolkit/DeleteFileModal'
import FileSystemContext from './FileSystemContext'

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
	const {
		filePath,
		isRootFilePath,
		navigateUpFolderTree,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const [
		isDeleteFileModalVisible,
		setIsDeleteFileModalVisible,
	] = (
		useState(
			false
		)
	)

	const closeDeleteFileModal = (
		useCallback(
			() => {
				setIsDeleteFileModalVisible(
					false
				)
			},
			[],
		)
	)

	const openDeleteFileModal = (
		useCallback(
			() => {
				setIsDeleteFileModalVisible(
					true
				)
			},
			[],
		)
	)

	const deleteFolder = (
		useCallback(
			() => {
				ipcRenderer
				.invoke(
					'deleteFilePath',
					{ filePath },
				)
				.then(
					navigateUpFolderTree
				)
				.then(
					closeDeleteFileModal
				)
			},
			[
				closeDeleteFileModal,
				filePath,
				navigateUpFolderTree,
			],
		)
	)

	return (
		<div css={directoryControlsStyles}>
			{
				!isRootFilePath
				&& (
					<div
						css={navigationStyles}
						onClick={navigateUpFolderTree}
						title="^ Go up a Directory"
					>
						<ArrowUpwardRoundedIcon />
					</div>
				)
			}

			<div
				css={directoryNameStyles}
				onClick={navigateUpFolderTree}
			>
				{filePath}
			</div>

			<div onClick={openDeleteFileModal}>
				<DeleteForeverRoundedIcon />
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
