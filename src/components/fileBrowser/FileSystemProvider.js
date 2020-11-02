import PropTypes from 'prop-types'
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
const yargs = global.require('yargs')
const { remote } = global.require('electron')

const defaultFilePath = (
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

const propTypes = {
	children: PropTypes.node.isRequired,
}

const FileSystemProvider = ({
	children,
}) => {
	const [
		filePath,
		setFilePath,
	] = useState(defaultFilePath)

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

	const directoryPaths = (
		useDirectoryPaths(
			filePath
		)
	)

	const imageFilePaths = (
		useImageFilePaths(
			filePath
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
