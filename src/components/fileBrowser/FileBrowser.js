import {
	memo,
	useContext,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import ImageFile from './ImageFile'

const { css } = global.require('@emotion/core')

const fileBrowserStyles = css`
	display: flex;
	flex-wrap: wrap;
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
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
