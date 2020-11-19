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

const systemDirectories = [
	'$recycle.bin',
	'$winreagent',
	'ai_recyclebin',
	'config.msi',
	'recovery',
	'system volume information',
	'windows',
]

const useDirectoryPaths = directoryContents => {
	const [
		directoryPaths,
		setDirectoryPaths,
	] = useState([])

	useEffect(
		() => {
			const subscriber = (
				from(directoryContents)
				.pipe(
					filter(({
						isDirectory,
					}) => (
						isDirectory
					)),
					filter(({
						fileName,
					}) => (
						!(
							systemDirectories
							.includes(
								fileName
								.toLowerCase()
							)
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
					setDirectoryPaths
				)
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[directoryContents],
	)

	return directoryPaths
}

export default useDirectoryPaths
