import path from 'path'
import {
	useEffect,
	useState,
} from 'react'
import { from } from 'rxjs'
import {
	filter,
	map,
	toArray,
} from 'rxjs/operators'

import compareNaturalStrings from './compareNaturalStrings'

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

const useImageFiles = directoryContents => {
	const [
		imageFiles,
		setImageFiles,
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
						name: fileName,
						path: filePath,
					})),
					toArray(),
					map(imageFiles => (
						imageFiles
						.slice()
						.sort((
							a,
							b,
						) => (
							compareNaturalStrings(
								a
								.name,
								b
								.name,
							)
						))
					)),
				)
				.subscribe(
					setImageFiles
				)
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[directoryContents],
	)

	return imageFiles
}

export default useImageFiles
