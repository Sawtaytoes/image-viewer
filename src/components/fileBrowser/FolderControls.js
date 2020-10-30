import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const path = global.require('path')
const { css } = global.require('@emotion/core')

const folderControlsStyles = css`
	display: flex;
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
			<div onClick={goUpFolderTree}>
				^ Up Directory
			</div>

			<div>
				{filePath}
			</div>
		</div>
	)
}

const MemoizedFolderControls = memo(FolderControls)

export default MemoizedFolderControls
