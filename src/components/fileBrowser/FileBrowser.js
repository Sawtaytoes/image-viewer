import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import FolderControls from './FolderControls'
import ImageFile from './ImageFile'
import ImageLoaderContext from '../imageLoader/ImageLoaderContext'
import ImageViewerContext from '../imageViewer/ImageViewerContext'
import VirtualizedList from './VirtualizedList'

const fileBrowserStyles = css`
	display: grid;
	height: 100vh;
	width: 100%;
	grid-template-rows: auto 1fr;
`

const FileBrowser = () => {
	const previousSelectedImageIndexRef = useRef()

	const {
		directories,
		imageFiles,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const {
		imageFilePath,
	} = (
		useContext(
			ImageViewerContext
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

	useMemo(
		() => {
			previousSelectedImageIndexRef
			.current = 0
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			// We need to run this callback only when `imageFiles` updates.
			imageFiles,
		],
	)

	const selectedImageIndex = (
		useMemo(
			() => (
				imageFilePath
				? (
					imageFiles
					.findIndex(({
						path,
					}) => (
						path === imageFilePath
					))
				)
				: (
					previousSelectedImageIndexRef
					.current
				)
			),
			[
				imageFilePath,
				imageFiles,
			],
		)
	)

	previousSelectedImageIndexRef
	.current = selectedImageIndex

	return (
		<div css={fileBrowserStyles}>
			<FolderControls />

			<VirtualizedList
				itemPadding="4px"
				numberOfColumns={4}
				selectedIndex={selectedImageIndex}
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
