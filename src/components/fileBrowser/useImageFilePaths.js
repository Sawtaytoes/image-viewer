import { from } from 'rxjs'
import {
	filter,
	map,
	toArray,
} from 'rxjs/operators'
import {
 useEffect,
 useState,
} from 'react'

import compareNaturalStrings from './compareNaturalStrings'

const path = global.require('path')

const validImageExtensions = [
	'.apng',
	'.avif',
	'.bmp',
	'.gif',
	'.ico',
	'.cur',
	'.jpg',
	'.jpeg',
	'.jfif',
	'.pjpeg',
	'.pjp',
	'.png',
	'.svg',
	'.webp',
]

const useImageFilePaths = directoryContents => {
	const [
		imageFilePaths,
		setImageFilePaths,
	] = useState([])

	useEffect(
		() => {
			const subscriber = (
				from(directoryContents)
				.pipe(
					filter(({
						isFile,
					}) => (
						isFile
					)),
					filter(({
						fileName,
					}) => (
						validImageExtensions
						.includes(
							path
							.extname(
								fileName
							)
							.toLowerCase()
						)
					)),
					map(({
						fileName,
						filePath,
					}) => ({
						fileName,
						filePath,
					})),
					toArray(),
					map(directoryPaths => (
						directoryPaths
						.slice()
						.sort((
							a,
							b,
						) => (
							compareNaturalStrings(
								a.fileName,
								b.fileName,
							)
						))
					)),
				)
				.subscribe(
					setImageFilePaths
				)
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[directoryContents],
	)

	return imageFilePaths
}

export default useImageFilePaths
