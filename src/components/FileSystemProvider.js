import PropTypes from 'prop-types'
import {
	useCallback,
	useMemo,
	useState,
} from 'react'

import FileSystemContext from './FileSystemContext'
import useImageFilePaths from './hooks/useImageFilePaths'

const config = window.require('config')
const yargs = window.require('yargs')
const { remote } = window.require('electron')

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

	const imageFilePaths = (
		useImageFilePaths(
			filePath
		)
	)

	const filePathProviderValue = (
		useMemo(
			() => ({
				imageFilePaths,
				onFilePathChanged,
			}),
			[
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
