import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'

import DeleteFileModal from '../toolkit/DeleteFileModal'
import Directory from './Directory'
import DirectoryControls from './DirectoryControls'
import FileSystemContext from './FileSystemContext'
import ImageFile from './ImageFile'
import ImageLoaderContext from '../imageLoader/ImageLoaderContext'
import ImageViewerContext from '../imageViewer/ImageViewerContext'
import useKeyboardControls from '../convenience/useKeyboardControls'
import VirtualizedList from './VirtualizedList'

const { ipcRenderer } = require('electron')

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
	const animationFrameIdRef = useRef()
	const virtualizedListContainerRef = useRef()

	const [
		isDeleteFileModalVisible,
		setIsDeleteFileModalVisible,
	] = (
		useState(
			false
		)
	)

	const [
		numberOfColumns,
		setNumberOfColumns,
	] = (
		useState(1)
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

	const closeDeleteFileModal = (
		useCallback(
			() => {
				setIsDeleteFileModalVisible(
					false
				)
			},
			[],
		)
	)

	const openDeleteFileModal = (
		useCallback(
			() => {
				setIsDeleteFileModalVisible(
					true
				)
			},
			[],
		)
	)

	const deleteFolder = (
		useCallback(
			() => {
				const numberOfDirectories = (
					directories
					.length
				)

				ipcRenderer
				.invoke(
					'deleteFilePath',
					{
						filePath: (
							selectedIndex
							< numberOfDirectories
						)
						? (
							directories
							[selectedIndex]
							.path
						)
						: (
							imageFiles
							[
								selectedIndex
								- numberOfDirectories
							]
							.path
						),
					},
				)
				.then(() => {
					setFilePath(
						''
					)
				})
				.then(() => {
					setFilePath(
						filePath
					)
				})
				.then(
					closeDeleteFileModal
				)
			},
			[
				closeDeleteFileModal,
				directories,
				filePath,
				imageFiles,
				selectedIndex,
				setFilePath,
			],
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

	useKeyboardControls(event => {
		if (
			isDeleteFileModalVisible
			|| imageFilePath
		) {
			return
		}

		const {
			code,
			ctrlKey: isCtrlKeyHeld,
			shiftKey: isShiftKeyHeld,
		} = event

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
			code === 'Delete'
		) {
			openDeleteFileModal()
		}
		else if (
			code === 'Backspace'
			|| code === 'Escape'
		) {
			navigateUpFolderTree()
		}
		else if (code === 'Enter') {
			const numberOfDirectories = (
				directories
				.length
			)

			if (isShiftKeyHeld) {
				ipcRenderer
				.send(
					'createNewWindow',
					{ filePath }
				)
			}
			else if (isCtrlKeyHeld) {
				ipcRenderer
				.send(
					'createNewWindow',
					{
						filePath: (
							(
								selectedIndex
								< numberOfDirectories
							)
							? (
								directories
								[selectedIndex]
								.path
							)
							: (
								imageFiles
								[
									selectedIndex
									- numberOfDirectories
								]
								.path
							)
						),
					}
				)
			}
			else if (
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

	useLayoutEffect(
		() => {
			const calculateNumberOfColumns = () => {
				const viewWidth = (
					virtualizedListContainerRef
					.current
					.clientWidth
				)

				const nextNumberOfColumns = (
					Math.floor(viewWidth / 300)
				)

				setNumberOfColumns(
					Math
					.max(
						1,
						nextNumberOfColumns,
					)
				)
			}

			const throttleColumnCountCalculation = () => {
				if (
					animationFrameIdRef
					.current
				) {
					return
				}

				animationFrameIdRef
				.current = (
					window
					.requestAnimationFrame(() => {
						animationFrameIdRef
						.current = null

						calculateNumberOfColumns()
					})
				)
			}

			const resizeObserver = (
				new ResizeObserver(
					throttleColumnCountCalculation
				)
			)

			resizeObserver
			.observe(
				virtualizedListContainerRef
				.current
			)

			return () => {
				window
				.cancelAnimationFrame(
					animationFrameIdRef
					.current
				)

				animationFrameIdRef
				.current = null

				resizeObserver
				.disconnect()
			}
		},
		[],
	)

	return (
		<div css={fileBrowserStyles}>
			<DirectoryControls />

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

			<DeleteFileModal
				isVisible={isDeleteFileModalVisible}
				onClose={closeDeleteFileModal}
				onConfirm={deleteFolder}
			/>
		</div>
	)
}

const MemoizedFileBrowser = memo(FileBrowser)

export default MemoizedFileBrowser
