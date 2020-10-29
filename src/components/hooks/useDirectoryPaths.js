import {
 useEffect,
 useState,
} from 'react'

const fs = global.require('fs')
const path = global.require('path')
const { bindNodeCallback } = global.require('rxjs')
const {
	filter,
	map,
	mapTo,
	mergeAll,
	mergeMap,
	toArray,
} = global.require('rxjs/operators')

const useDirectoryPaths = filePath => {
	const [
		directoryPaths,
		setDirectoryPaths,
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
					map(fileName => (
						path
						.join(
							filePath,
							fileName,
						)
					)),
					mergeMap(fileName => (
						bindNodeCallback(
							fs
							.lstat
							.bind(fs)
						)(
							fileName
						)
						.pipe(
							filter(stats => (
								stats
								.isDirectory()
							)),
							mapTo(fileName),
						)
					)),
					toArray(),
				)
				.subscribe(
					setDirectoryPaths
				)
			)

			// return unsubscribe // TEMP. Figure out why it errors trying to close the directory.
		},
		[filePath],
	)

	return directoryPaths
}

export default useDirectoryPaths
