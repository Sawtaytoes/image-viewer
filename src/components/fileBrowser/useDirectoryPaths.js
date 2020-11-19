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
	'$RECYCLE.BIN',
	'System Volume Information',
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
						name,
					}) => (
						!(
							systemDirectories
							.includes(
								name
							)
						)
					)),
					map(({
						filePath,
					}) => (
						filePath
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
