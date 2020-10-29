import {
 useCallback, useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const path = global.require('path')

const FolderControls = () => {
	const {
		filePath,
		onFilePathChanged,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const goUpFolderTree = (
		useCallback(
			() => {
				onFilePathChanged(
					path
					.join(
						path
						.dirname(filePath),
						'..',
					)
				)
			},
			[
				filePath,
				onFilePathChanged,
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

export default FolderControls
