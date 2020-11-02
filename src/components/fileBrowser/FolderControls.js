import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const path = global.require('path')

const folderControlsStyles = css`
	align-items: center;
	display: flex;
`

const folderNameStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
`

const navigationStyles = css`
	padding: 4px;
`

const FolderControls = () => {
	const {
		filePath,
		setFilePath,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const goUpFolderTree = (
		useCallback(
			() => {
				setFilePath(
					path
					.join(
						filePath,
						'..',
					)
				)
			},
			[
				filePath,
				setFilePath,
			],
		)
	)

	return (
		<div css={folderControlsStyles}>
			<div
				css={navigationStyles}
				onClick={goUpFolderTree}
				title="^ Go up a Directory"
			>
				<ArrowUpwardRoundedIcon />
			</div>

			<div css={folderNameStyles}>
				{filePath}
			</div>
		</div>
	)
}

const MemoizedFolderControls = memo(FolderControls)

export default MemoizedFolderControls
