import {
	filter,
	map,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	finishedFilePathDownload,
	removeFilePathFromProcessingQueue,
	stopFilePathDownload,
} from './imageLoaderActions'

const downloadFileCompletionEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(
			finishedFilePathDownload.type,
			stopFilePathDownload.type,
		),
		pluck('payload'),
		map(({
			filePath,
		}) => ({
			filePath,
			isProcessing: (
				state$
				.value
				.processingQueue
				[filePath]
			),
		})),
		map(({
			filePath,
			isProcessing,
		}) => (
			isProcessing
			&& (
				removeFilePathFromProcessingQueue({
					filePath,
				})
			)
		)),
		filter(Boolean),
		tap(dispatch),
	)
)

export default downloadFileCompletionEpic
