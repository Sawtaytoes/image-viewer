import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import FolderControls from './FolderControls'
import ImageFile from './ImageFile'
import ImageLoaderContext from '../imageLoader/ImageLoaderContext'
import ImageViewerContext from '../imageViewer/ImageViewerContext'
import VirtualizedList from './VirtualizedList'

const fileBrowserStyles = css`
	background-color: #444;
	color: #fafafa;
	display: grid;
	height: 100vh;
	width: 100%;
	grid-template-rows: auto 1fr;
`

const FileBrowser = () => {
	const [
		previousFilePath,
		setPreviousFilePath,
	] = (
		useState('')
	)
	const [
		previousImageFilePath,
		setPreviousImageFilePath,
	] = (
		useState('')
	)

	const {
		directories,
		filePath,
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

	useEffect(
		() => () => {
			setPreviousFilePath(
				filePath
			)

			setPreviousImageFilePath(
				imageFilePath
			)
		},
		[
			filePath,
			imageFilePath,
		],
	)

	const selectedImageIndex = (
		useMemo(
			() => (
				previousImageFilePath
				? (
					imageFiles
					.findIndex(({
						path,
					}) => (
						path === previousImageFilePath
					))
				)
				: (
					directories
					.findIndex(({
						path,
					}) => (
						path === previousFilePath
					))
				)
			),
			[
				directories,
				imageFiles,
				previousFilePath,
				previousImageFilePath,
			],
		)
	)

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
