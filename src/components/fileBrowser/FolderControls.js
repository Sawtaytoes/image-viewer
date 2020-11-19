import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const path = global.require('path')
const { remote } = global.require('electron')

const folderControlsStyles = css`
	align-items: center;
	display: flex;
`

const folderNameStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	user-select: none;
`

const navigationStyles = css`
	padding: 4px;
`

const windowsDrives = (
	(
		remote
		.getGlobal('windowsDrives')
		|| []
	)
	.map(driveLetter => ({
		filePath: driveLetter,
		isDirectory: true,
		isFile: false,
		name: driveLetter,
	}))
)

const FolderControls = () => {
	const {
		filePath,
		setDirectoryContents,
		setFilePath,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const goUpFolderTree = (
		useCallback(
			() => {
				const nextFilePath = (
					path
					.join(
						filePath,
						'..',
					)
				)

				if (
					filePath === nextFilePath
					&& windowsDrives
				) {
					setDirectoryContents(
						windowsDrives
					)
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
				setDirectoryContents,
				setFilePath,
			],
		)
	)

	return (
		<div
			css={folderControlsStyles}
			onClick={goUpFolderTree}
		>
			<div
				css={navigationStyles}
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
