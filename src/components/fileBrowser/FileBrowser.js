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
	display: flex;
	flex-direction: column;
	height: 100vh;
	width: 100%;
`

const filesListStyles = css`
	display: flex;
	flex-wrap: wrap;
`

const spacerStyles = css`
	flex: 1 0 auto;
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

			<div css={spacerStyles} />

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

			<div css={spacerStyles} />
		</div>
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
