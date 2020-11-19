import PropTypes from 'prop-types'
import { css } from '@emotion/core'
import {
	memo,
	useCallback,
	useContext,
	useRef,
} from 'react'

import FileSystemContext from './FileSystemContext'
import useResizableSquareContainerEffect from './useResizableSquareContainerEffect'

const directoryStyles = css`
	background-color: #fffffb;
	border: 2px solid lightgray;
	color: #333;
	cursor: pointer;
	font-family: 'Source Sans Pro', sans-serif;
	padding: 10px 14px;
`

const propTypes = {
	directoryName: PropTypes.string.isRequired,
	directoryPath: PropTypes.string.isRequired,
}

const Directory = ({
	directoryName,
	directoryPath,
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

	const directoryRef = useRef()

	useResizableSquareContainerEffect(
		directoryRef
	)

	return (
		<div
			css={directoryStyles}
			onClick={goToDirectory}
			ref={directoryRef}
		>
			{directoryName}
		</div>
	)
}

Directory.propTypes = propTypes

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
