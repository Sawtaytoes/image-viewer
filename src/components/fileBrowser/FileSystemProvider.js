import PropTypes from 'prop-types'
import {
	memo,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { bindNodeCallback } from 'rxjs'
import {
	map,
	mergeAll,
	toArray,
} from 'rxjs/operators'

import FileSystemContext from './FileSystemContext'
import useDirectories from './useDirectories'
import useImageFiles from './useImageFiles'

const config = global.require('config')
const fs = global.require('fs')
const path = global.require('path')
const yargs = global.require('yargs')
const { remote } = global.require('electron')

const windowsDrivePaths = (
	(
		remote
		.getGlobal('windowsDrives')
		|| []
	)
	.map(driveLetter => ({
		fileName: driveLetter,
		filePath: driveLetter,
		isDirectory: true,
		isFile: false,
	}))
)

const initialFilePath = (
	(
		sessionStorage
		.getItem('filePath')
	)
	|| (
		yargs(
			remote
			.getGlobal('processArgs')
		)
		.argv
		.filePath
	)
	|| (
		config
		.get('filePath')
	)
	|| './'
)

const initialDirectoryContents = []

const propTypes = {
	children: PropTypes.node.isRequired,
}

const FileSystemProvider = ({
	children,
}) => {
	const [
		filePath,
		setFilePath,
	] = (
		useState(
			initialFilePath
		)
	)

	const [
		directoryContents,
		setDirectoryContents,
	] = (
		useState(
			initialDirectoryContents
		)
	)

	useEffect(
		() => {
			sessionStorage
			.setItem(
				'filePath',
				filePath,
			)
		},
		[filePath],
	)

	useEffect(
		() => {
			if (!filePath) {
				if (windowsDrivePaths) {
					setDirectoryContents(
						windowsDrivePaths
					)
				}
				else {
					setFilePath(
						path
						.sep
					)
				}
			}
		},
		[filePath],
	)

	useEffect(
		() => {
			if (!filePath) {
				return
			}

			const subscriber = (
				bindNodeCallback(
					fs
					.readdir
					.bind(fs)
				)(
					filePath,
					{ withFileTypes: true },
				)
				.pipe(
					mergeAll(),
					map(directoryEntry => ({
						fileName: (
							directoryEntry
							.name
						),
						filePath: (
							path
							.join(
								filePath,
								(
									directoryEntry
									.name
								),
							)
						),
						isDirectory: (
							directoryEntry
							.isDirectory()
						),
						isFile: (
							directoryEntry
							.isFile()
						),
					})),
					toArray(),
				)
				.subscribe(
					setDirectoryContents
				)
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[filePath],
	)

	const directories = (
		useDirectories(
			directoryContents
		)
	)

	const imageFiles = (
		useImageFiles(
			directoryContents
		)
	)

	const filePathProviderValue = (
		useMemo(
			() => ({
				directories,
				filePath,
				imageFiles,
				setFilePath,
			}),
			[
				directories,
				filePath,
				imageFiles,
				setFilePath,
			],
		)
	)

	return (
		<FileSystemContext.Provider
			value={filePathProviderValue}
		>
			{children}
		</FileSystemContext.Provider>
	)
}

FileSystemProvider.propTypes = propTypes

const MemoizedFileSystemProvider = memo(FileSystemProvider)

export default MemoizedFileSystemProvider
