import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
} from 'react'

import FileSystemContext from './FileSystemContext'

const directoryStyles = css`
	background-color: #fffffa;
	border: 2px solid lightgray;
	border-radius: 14px;
	color: #333;
	cursor: pointer;
	font-family: 'Source Sans Pro', sans-serif;
	padding: 10px 14px;
`

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
		<div
			css={directoryStyles}
			onClick={goToDirectory}
		>
			{directoryPath}
		</div>
	)
}

Directory.propTypes = propTypes

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
