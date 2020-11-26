import { css } from '@emotion/core'
import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react'
import { bindNodeCallback } from 'rxjs'
import {
	map,
	mergeAll,
	toArray,
} from 'rxjs/operators'

import FileSystemContext from './FileSystemContext'
import Image from '../imageViewer/Image'
import useImageFiles from './useImageFiles'

const fs = global.require('fs')
const path = global.require('path')

const directoryStyles = css`
	background-color: #666;
	color: #fafafa;
	cursor: pointer;
	font-family: 'Source Sans Pro', sans-serif;
	padding-bottom: 100%;
	position: relative;
	width: 100%;
`

const directoryContentStyles = css`
	bottom: 0;
	display: flex;
	flex-direction: column;
	left: 0;
	padding: 6px 10px;
	position: absolute;
	right: 0;
	top: 0;
`

const imageStyles = css`
	flex: 1 1 auto;
`

const textStyles = css`
	padding-bottom: 6px;
	word-wrap: break-word;
`

const initialDirectoryContents = []

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

	const [
		directoryContents,
		setDirectoryContents,
	] = (
		useState(
			initialDirectoryContents
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

	useEffect(
		() => {
			if (!directoryPath) {
				return
			}

			const subscriber = (
				bindNodeCallback(
					fs
					.readdir
					.bind(fs)
				)(
					directoryPath,
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
								directoryPath,
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
		[directoryPath],
	)

	const imageFiles = (
		useImageFiles(
			directoryContents
		)
	)

	return (
		<div
			css={directoryStyles}
			onClick={goToDirectory}
		>
			<div css={directoryContentStyles}>
				<div css={textStyles}>
					{directoryName}
				</div>

				{
					imageFiles[0]
					&& (
						<div css={imageStyles}>
							<Image
								fileName={imageFiles[0].name}
								filePath={imageFiles[0].path}
								hasVisibilityDetection
							/>
						</div>
					)
				}
			</div>
		</div>
	)
}

Directory.propTypes = propTypes

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
