import PropTypes from 'prop-types'
import {
	useCallback,
	useMemo,
	useState,
} from 'react'

import FileSystemContext from './FileSystemContext'
import useDirectoryPaths from './hooks/useDirectoryPaths'
import useImageFilePaths from './hooks/useImageFilePaths'

const config = global.require('config')
const yargs = global.require('yargs')
const { remote } = global.require('electron')

const defaultFilePath = (
	(
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

	const onFilePathChanged = (
		useCallback(
			nextFilePath => {
				setFilePath(
					nextFilePath
				)
			},
			[],
		)
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
				onFilePathChanged,
			}),
			[
				directoryPaths,
				filePath,
				imageFilePaths,
				onFilePathChanged,
			],
		)
	)

	return (
		<FileSystemContext.Provider value={filePathProviderValue}>
			{children}
		</FileSystemContext.Provider>
	)
}

FileSystemProvider.propTypes = propTypes

export default FileSystemProvider
