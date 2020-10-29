import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const propTypes = {
	children: PropTypes.string.isRequired,
}

const Directory = ({
	children: directoryPath,
}) => {
	const {
		setFilePath,
	} = (
		useContext(
			FileSystemContext
		)
	)

	const goToDirectory = (
		useCallback(
			() => {
				setFilePath(
					directoryPath
				)
			},
			[
				directoryPath,
				setFilePath,
			],
		)
	)

	return (
		<div onClick={goToDirectory}>
			{directoryPath}
		</div>
	)
}

Directory.propTypes = propTypes

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
