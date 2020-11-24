import {
	filter,
	map,
	mergeAll,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	addFilePath,
	addFilePathToPriorityQueue,
	addFilePathToStandbyQueue,
	removeFilePathFromPriorityQueue,
	removeFilePathFromProcessingQueue,
	removeFilePathFromStandbyQueue,
} from './imageLoaderActions'

const addFilePathEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(addFilePath.type),
		pluck('payload'),
		filter(({
			filePath,
		}) => (
			!(
				state$
				.value
				.downloadedFiles
				[filePath]
			)
		)),
		map(({
			filePath,
			...otherProps
		}) => ({
			...otherProps,
			filePath,
			isPrioritized: (
				state$
				.value
				.priorityQueue
				[filePath]
			),
			isProcessing: (
				state$
				.value
				.processingQueue
				[filePath]
			),
			isStandingBy: (
				state$
				.value
				.standbyQueue
				[filePath]
			),
		})),
		map(({
			filePath,
			isPrioritized,
			isProcessing,
			isStandingBy,
			isVisible,
		}) => ([
			(
				!isVisible
				&&	isPrioritized
				&& (
					removeFilePathFromPriorityQueue({
						filePath,
					})
				)
			),
			(
				!isVisible
				&& isProcessing
				&& (
					removeFilePathFromProcessingQueue({
						filePath,
					})
				)
			),
			(
				isVisible
				&& isStandingBy
				&& (
					removeFilePathFromStandbyQueue({
						filePath,
					})
				)
			),
			(
				isVisible
				&&	!isProcessing
				&& (
					addFilePathToPriorityQueue({
						filePath,
					})
				)
			),
			(
				!isVisible
				&& (
					addFilePathToStandbyQueue({
						filePath,
					})
				)
			),
		])),
		mergeAll(),
		filter(Boolean),
		tap(dispatch),
	)
)

export default addFilePathEpic
