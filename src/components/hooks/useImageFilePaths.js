import {
 useEffect,
 useState,
} from 'react'

const fs = window.require('fs')
const path = window.require('path')
const { bindNodeCallback } = window.require('rxjs')
const {
	filter,
	map,
	mergeAll,
	toArray,
} = window.require('rxjs/operators')

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
			const { unsubscribe } = (
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
				)
				.subscribe(
					setImageFilePaths
				)
			)

			return unsubscribe
		},
		[filePath],
	)

	return imageFilePaths
}

export default useImageFilePaths
