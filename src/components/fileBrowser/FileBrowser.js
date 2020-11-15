import { css } from '@emotion/core'
import {
	memo,
	useContext,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import FolderControls from './FolderControls'
import ImageFile from './ImageFile'

const fileBrowserStyles = css`
	display: grid;
	height: 100vh;
	width: 100%;
	grid-template-rows: auto 1fr;
`

const filesListStyles = css`
	align-items: center;
	display: flex;
	flex-wrap: wrap;
	height: 100%;
	overflow-y: auto;
`

const fileStyles = css`
	flex: 0 0 25%;
	padding: 4px;
	width: 25%;
`

const FileBrowser = () => {
	const {
		directoryPaths,
		imageFilePaths,
	} = (
		useContext(
			FileSystemContext
		)
	)

	return (
		<div css={fileBrowserStyles}>
			<FolderControls />

			<div css={filesListStyles}>
				{
					directoryPaths
					.map(directoryPath => (
						<div
							css={fileStyles}
							key={directoryPath}
						>
							<Directory
								directoryPath={directoryPath}
							/>
						</div>
					))
				}

				{
					imageFilePaths
					.map(imageFilePath => (
						<div
							css={fileStyles}
							key={imageFilePath}
						>
							<ImageFile
								filePath={imageFilePath}
							/>
						</div>
					))
				}
			</div>
		</div>
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
