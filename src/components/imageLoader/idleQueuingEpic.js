import {
	distinctUntilChanged,
	filter,
	map,
	mergeAll,
	pluck,
	tap,
} from 'rxjs/operators'

import {
	addFilePathToProcessingQueue,
	removeFilePathFromStandbyQueue,
} from './imageLoaderActions'

const idleQueuingEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	state$
	.pipe(
		pluck('processingQueue'),
		distinctUntilChanged(),
		map(processingQueue => (
			Object
			.keys(
				processingQueue
			)
			.length
		)),
		filter(processingQueueLength => (
			processingQueueLength === 0
		)),
		map(() => (
			Object
			.keys(
				state$
				.value
				.standbyQueue
			)
		)),
		filter(standbyQueueKeys => (
			standbyQueueKeys.length > 0
		)),
		mergeAll(),
		map(filePath => ([
			(
				removeFilePathFromStandbyQueue({
					filePath,
				})
			),
			(
				addFilePathToProcessingQueue({
					filePath,
				})
			),
		])),
		mergeAll(),
		tap(dispatch),
	)
)

export default idleQueuingEpic
