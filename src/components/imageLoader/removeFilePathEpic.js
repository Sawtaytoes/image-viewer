import {
	map,
	mergeAll,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	removeDownloadedFile,
	removeFilePath,
	removeFilePathFromProcessingQueue,
	removeFilePathFromStandbyQueue,
	resetDownloadedPercentage,
} from './imageLoaderActions'

const removeFilePathEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(removeFilePath.type),
		pluck('payload'),
		tap(({
			filePath,
		}) => {
			URL
			.revokeObjectURL(
				state$
				.value
				.downloadedFiles
				[filePath]
			)
		}),
		map(({
			filePath,
		}) => ([
			(
				removeFilePathFromProcessingQueue({
					filePath,
				})
			),
			(
				removeFilePathFromStandbyQueue({
					filePath,
				})
			),
			(
				resetDownloadedPercentage({
					filePath,
				})
			),
			(
				removeDownloadedFile({
					filePath,
				})
			),
		])),
		mergeAll(),
		tap(dispatch),
	)
)

export default removeFilePathEpic
