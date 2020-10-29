import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const path = global.require('path')

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
		<div>
			<div onClick={goUpFolderTree}>
				^ Up Directory
			</div>
		</div>
	)
}

const MemoizedFolderControls = memo(FolderControls)

export default MemoizedFolderControls
