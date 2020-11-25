import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded'
import DeleteForeverRoundedIcon from '@material-ui/icons/DeleteForeverRounded'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const fs = global.require('fs')
const path = global.require('path')

const folderControlsStyles = css`
	align-items: center;
	display: flex;
`

const folderNameStyles = css`
	flex: 1 1 auto;
	font-family: 'Source Sans Pro', sans-serif;
	user-select: none;
`

const navigationStyles = css`
	padding: 4px;
`

const FolderControls = () => {
	const {
		filePath,
		isRootFilePath,
		setFilePath,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const goUpFolderTree = (
		useCallback(
			() => {
				if (isRootFilePath) {
					return
				}

				const nextFilePath = (
					path
					.join(
						filePath,
						'..',
					)
				)

				if (filePath === nextFilePath) {
					setFilePath(
						''
					)
				}
				else {
					setFilePath(
						nextFilePath
					)
				}
			},
			[
				filePath,
				isRootFilePath,
				setFilePath,
			],
		)
	)

	const deleteFolder = (
		useCallback(
			() => {
				fs
				.rmdir(
					filePath,
					{
						recursive: true,
					},
					() => {
						console.log('deleted')
					},
				)
			},
			[filePath],
		)
	)

	return (
		<div
			css={folderControlsStyles}
			onClick={goUpFolderTree}
		>
			{
				!isRootFilePath
				&& (
					<div
						css={navigationStyles}
						title="^ Go up a Directory"
					>
						<ArrowUpwardRoundedIcon />
					</div>
				)
			}

			<div css={folderNameStyles}>
				{filePath}
			</div>

			<div hidden onClick={deleteFolder}>
				<DeleteForeverRoundedIcon />
			</div>
		</div>
	)
}

const MemoizedFolderControls = memo(FolderControls)

export default MemoizedFolderControls
