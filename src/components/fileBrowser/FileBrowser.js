import { css } from '@emotion/core'
import {
	memo,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import Directory from './Directory'
import FileSystemContext from './FileSystemContext'
import FolderControls from './FolderControls'
import ImageFile from './ImageFile'
import ImageLoaderContext from '../imageLoader/ImageLoaderContext'
import ImageViewerContext from '../imageViewer/ImageViewerContext'
import useFileBrowserKeyboardControls from './useFileBrowserKeyboardControls'
import VirtualizedList from './VirtualizedList'

const fileBrowserStyles = css`
	background-color: #444;
	color: #fafafa;
	display: grid;
	height: 100vh;
	width: 100%;
	grid-template-rows: auto 1fr;
`

const virtualizedListContainerStyles = css`
	overflow: hidden;
`

const FileBrowser = () => {
	const virtualizedListContainerRef = useRef()

	const [numberOfColumns] = (
		useState(3)
	)

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

	const [
		selectedIndex,
		setSelectedIndex,
	] = (
		useState(0)
	)

	const {
		directories,
		filePath,
		imageFiles,
		navigateUpFolderTree,
		setFilePath,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const {
		imageFilePath,
		setImageFile,
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

	const imageFilePathRef = useRef()

	imageFilePathRef
	.current = (
		imageFilePath
	)

	useLayoutEffect(
		() => {
			// Cannot listen directly to `imageFilePath` because this will update twice when it should only update once.
			const nextSelectedIndex = (
				(
					imageFilePathRef
					.current
				)
				? (
					imageFiles
					.findIndex(({
						path,
					}) => (
						Object
						.is(
							path,
							(
								imageFilePathRef
								.current
							),
						)
					))
				)
				: (
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
				)
			)

			setSelectedIndex(
				Math
				.max(
					0,
					nextSelectedIndex,
				)
			)
		},
		[
			directories,
			imageFiles,
			previousFilePath,
			previousImageFilePath,
		],
	)

	useFileBrowserKeyboardControls(({
		code,
	}) => {
		if (imageFilePath) {
			return
		}

		const keyCodeIndexValues = {
			ArrowDown: () => (
				numberOfColumns
			),
			ArrowLeft: () => (
				(
					keyCodeIndexValues
					.ArrowRight()
				)
				* -1
			),
			ArrowRight: () => (
				1
			),
			ArrowUp: () => (
				(
					keyCodeIndexValues
					.ArrowDown()
				)
				* -1
			),
			PageDown: () => {
				const viewHeight = (
					virtualizedListContainerRef
					.current
					.clientHeight
				)

				const itemSize = (
					(
						virtualizedListContainerRef
						.current
						.clientWidth
					) / numberOfColumns
				)

				const rowsInView = (
					Math
					.floor(
						viewHeight / itemSize
					)
				)

				return (
					rowsInView
					* numberOfColumns
				)
			},
			PageUp: () => (
				(
					keyCodeIndexValues
					.PageDown()
				)
				* -1
			),
		}

		if (
			code === 'Backspace'
			|| code === 'Escape'
		) {
			navigateUpFolderTree()
		}

		if (code === 'Enter') {
			const numberOfDirectories = (
				directories
				.length
			)

			if (
				selectedIndex
				< numberOfDirectories
			) {
				setFilePath(
					directories
					[selectedIndex]
					.path
				)
			}
			else {
				setImageFile(
					imageFiles
					[
						selectedIndex
						- numberOfDirectories
					]
				)
			}
		}
		else if (code === 'Home') {
			setSelectedIndex(
				0
			)
		}
		else if (code === 'End') {
			setSelectedIndex(
				(
					directories
					.length
				)
				+ (
					imageFiles
					.length
				)
				- 1
			)
		}
		else if (
			keyCodeIndexValues
			[code]
		) {
			setSelectedIndex(
				Math
				.min(
					(
						(
							directories
							.concat(
								imageFiles
							)
							.length
						)
						- 1
					),
					Math
					.max(
						0,
						(
							selectedIndex
							+ (
								keyCodeIndexValues
								[code]()
							)
						),
					),
				)
			)
		}
	})

	return (
		<div css={fileBrowserStyles}>
			<FolderControls />

			<div
				css={virtualizedListContainerStyles}
				ref={virtualizedListContainerRef}
			>
				<VirtualizedList
					itemPadding="2px"
					numberOfColumns={numberOfColumns}
					selectedIndex={selectedIndex}
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
		</div>
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
