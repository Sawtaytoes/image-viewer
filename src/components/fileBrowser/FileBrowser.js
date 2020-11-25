import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import FolderControls from './FolderControls'
import ImageFile from './ImageFile'
import ImageLoaderContext from '../imageLoader/ImageLoaderContext'
import VirtualizedList from './VirtualizedList'

const fileBrowserStyles = css`
	display: grid;
	height: 100vh;
	width: 100%;
	grid-template-rows: auto 1fr;
`

const FileBrowser = () => {
	const {
		directories,
		imageFiles,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const {
		unloadImage,
	} = (
		useContext(
			ImageLoaderContext
		)
	)

	useEffect(
		() => () => {
			imageFiles
			.forEach(({
				path,
			}) => (
				unloadImage({
					filePath: path,
				})
			))
		},
		[
			imageFiles,
			unloadImage,
		],
	)

	return (
		<div css={fileBrowserStyles}>
			<FolderControls />

			<VirtualizedList
				itemPadding="4px"
				numberOfColumns={4}
			>
				{
					directories
					.map(({
						name,
						path,
					}) => (
						<Directory
							directoryName={name}
							directoryPath={path}
							key={path}
						/>
					))
				}

				{
					imageFiles
					.map(({
						name,
						path,
					}) => (
						<ImageFile
							fileName={name}
							filePath={path}
							key={path}
						/>
					))
				}
			</VirtualizedList>
		</div>
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
