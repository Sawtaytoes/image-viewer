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
					.map(({
						fileName,
						filePath,
					}) => (
						<div
							css={fileStyles}
							key={filePath}
						>
							<Directory
								directoryName={fileName}
								directoryPath={filePath}
							/>
						</div>
					))
				}

				{
					imageFilePaths
					.map(({
						fileName,
						filePath,
					}) => (
						<div
							css={fileStyles}
							key={filePath}
						>
							<ImageFile
								fileName={fileName}
								filePath={filePath}
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
