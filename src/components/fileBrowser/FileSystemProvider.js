import PropTypes from 'prop-types'
import { bindNodeCallback } from 'rxjs'
import {
	map,
	mergeAll,
	toArray,
} from 'rxjs/operators'
import {
	memo,
	useEffect,
	useMemo,
	useState,
} from 'react'

import FileSystemContext from './FileSystemContext'
import useDirectoryPaths from './useDirectoryPaths'
import useImageFilePaths from './useImageFilePaths'

const config = global.require('config')
const fs = global.require('fs')
const path = global.require('path')
const yargs = global.require('yargs')
const { remote } = global.require('electron')

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
						name: (
							directoryEntry
							.name
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

	const directoryPaths = (
		useDirectoryPaths(
			directoryContents
		)
	)

	const imageFilePaths = (
		useImageFilePaths(
			directoryContents
		)
	)

	const filePathProviderValue = (
		useMemo(
			() => ({
				directoryPaths,
				filePath,
				imageFilePaths,
				setFilePath,
			}),
			[
				directoryPaths,
				filePath,
				imageFilePaths,
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
