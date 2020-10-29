import {
 useEffect,
 useState,
} from 'react'

import compareNaturalStrings from './compareNaturalStrings'

const fs = global.require('fs')
const path = global.require('path')
const { bindNodeCallback } = global.require('rxjs')
const {
	filter,
	map,
	mergeAll,
	toArray,
} = global.require('rxjs/operators')

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

const useImageFilePaths = filePath => {
	const [
		imageFilePaths,
		setImageFilePaths,
	] = useState([])

	useEffect(
		() => {
			// const { unsubscribe } = (
				bindNodeCallback(
					fs
					.readdir
					.bind(fs)
				)(
					filePath
				)
				.pipe(
					mergeAll(),
					filter(fileName => (
						validImageExtensions
						.includes(
							path
							.extname(
								fileName
							)
						)
					)),
					map(fileName => (
						path
						.join(
							filePath,
							fileName,
						)
					)),
					toArray(),
					map(directoryPaths => (
						directoryPaths
						.slice()
						.sort(
							compareNaturalStrings
						)
					)),
				)
				.subscribe(
					setImageFilePaths
				)
			// )

			// return unsubscribe // TEMP. Figure out why it errors trying to close the directory.
		},
		[filePath],
	)

	return imageFilePaths
}

export default useImageFilePaths
