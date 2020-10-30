import {
	memo,
	useContext,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import FolderControls from './FolderControls'
import ImageFile from './ImageFile'

const { css } = global.require('@emotion/core')

const fileBrowserStyles = css`
	display: flex;
	flex-direction: column;
	height: 100vh;
	width: 100vw;
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
			<div css={spacerStyles} />

			<div css={filesListStyles}>
				{
					directoryPaths
					.map(directoryPath => (
						<div
							// css={fileStyles}
							key={directoryPath}
						>
							<Directory>
								{directoryPath}
							</Directory>
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
							<ImageFile>
								{imageFilePath}
							</ImageFile>
						</div>
					))
				}
			</div>

			<div css={spacerStyles} />

			<FolderControls />
		</div>
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
