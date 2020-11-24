import {
	filter,
	map,
	mergeAll,
	tap,
} from 'rxjs/operators'

import {
	addFilePathToProcessingQueue,
	removeFilePathFromPriorityQueue,
	removeFilePathFromStandbyQueue,
} from './imageLoaderActions'

const processingQueueSize = 4

const processQueueEpic = (
	action$,
	state$,
	{
		createStateObservable,
		dispatch,
	},
) => (
	createStateObservable(({
		priorityQueue,
		processingQueue,
		standbyQueue,
	}) => ({
		priorityQueue,
		processingQueue,
		standbyQueue,
	}))
	.pipe(
		map(({
			priorityQueue,
			processingQueue,
			standbyQueue,
		}) => ({
			availableFilePaths: (
				Array
				.from(
					new Set(
						Object
						.keys(
							priorityQueue
						)
						.concat(
							Object
							.keys(
								standbyQueue
							)
						)
					)
				)
			),
			processingFilePaths: (
				Object
				.keys(
					processingQueue
				)
			),
		})),
		filter(({
			processingFilePaths,
		}) => (
			processingFilePaths.length
			< processingQueueSize
		)),
		map(({
			availableFilePaths,
			processingFilePaths,
		}) => (
			availableFilePaths
			.slice(
				0,
				(
					processingQueueSize
					- processingFilePaths.length
				),
			)
		)),
		mergeAll(),
		map(filePath => ({
			filePath,
			isPrioritized: (
				state$
				.value
				.priorityQueue
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
			isStandingBy,
		}) => ([
			(
				isPrioritized
				&& (
					removeFilePathFromPriorityQueue({
						filePath,
					})
				)
			),
			(
				isStandingBy
				&& (
					removeFilePathFromStandbyQueue({
						filePath,
					})
				)
			),
			(
				addFilePathToProcessingQueue({
					filePath,
				})
			),
		])),
		mergeAll(),
		filter(Boolean),
		tap(dispatch),
	)
)

export default processQueueEpic
