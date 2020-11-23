import {
	concatAll,
	filter,
	map,
	mergeAll,
	takeUntil,
	pluck,
	tap,
} from 'rxjs/operators'

import createFileDownloadObservable from './createFileDownloadObservable'
import ofType from './ofType'
import {
	addDownloadedFile,
	addFilePathToProcessingQueue,
	addFilePathToStandbyQueue,
	removeFilePathFromProcessingQueue,
	updateDownloadPercentage,
} from './imageLoaderActions'

const downloadFilePathsEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(addFilePathToProcessingQueue.type),
		pluck('payload'),
		map(({
			filePath,
			namespace,
		}) => (
			createFileDownloadObservable(
				filePath
			)
			.pipe(
				takeUntil(
					action$
					.pipe(
						ofType(
							addFilePathToStandbyQueue.type,
							removeFilePathFromProcessingQueue.type,
						),
						pluck('payload'),
						filter(({
							namespace: expectedNamespace,
						}) => (
							expectedNamespace === namespace
						)),
					)
				),
				map(({
					downloadPercentage,
					fileContents,
				}) => ([
					(
						typeof downloadPercentage === 'number'
						&& (
							updateDownloadPercentage({
								downloadPercentage,
								filePath,
							})
						)
					),
					(
						fileContents
						&& (
							addDownloadedFile({
								fileContents,
								filePath,
							})
						)
					),
				])),
				mergeAll(),
				filter(Boolean),
				tap(dispatch),
			)
		)),
		concatAll(4),
	)
)

export default downloadFilePathsEpic
