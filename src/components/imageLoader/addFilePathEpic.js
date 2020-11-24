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
	removeFilePathFromProcessingQueue,
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
			isVisible,
		}) => ([
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
				&& isProcessing
				&& (
					removeFilePathFromProcessingQueue({
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
