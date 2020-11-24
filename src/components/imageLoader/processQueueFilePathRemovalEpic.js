import {
	filter,
	map,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	removeFilePathFromProcessingQueue,
	stopFilePathDownload,
} from './imageLoaderActions'

const processQueueFilePathRemovalEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(removeFilePathFromProcessingQueue.type),
		pluck('payload'),
		map(({
			filePath,
		}) => ({
			filePath,
			isDownloaded: (
				state$
				.value
				.downloadedFiles
				[filePath]
			),
		})),
		map(({
			filePath,
			isDownloaded,
		}) => (
			!isDownloaded
			&& (
				stopFilePathDownload({
					filePath,
				})
			)
		)),
		filter(Boolean),
		tap(dispatch),
	)
)

export default processQueueFilePathRemovalEpic
