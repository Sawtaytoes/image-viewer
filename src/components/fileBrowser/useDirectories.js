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

const useDirectories = directoryContents => {
	const [
		directories,
		setDirectories,
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
						name: fileName,
						path: filePath,
					})),
					toArray(),
					map(directories => (
						directories
						.slice()
						.sort((
							a,
							b,
						) => (
							compareNaturalStrings(
								a.name,
								b.name,
							)
						))
					)),
				)
				.subscribe(
					setDirectories
				)
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[directoryContents],
	)

	return directories
}

export default useDirectories
