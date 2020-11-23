import {
	filter,
	mapTo,
	mergeMap,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	addFilePathToStandbyQueue,
	removeFilePathFromProcessingQueue,
	startFilePathDownload,
	stopFilePathDownload,
} from './imageLoaderActions'

const downloadCancelationEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(
			startFilePathDownload.type,
		),
		mergeMap(({
			namespace,
			payload,
		}) => (
			action$
			.pipe(
				ofType(
					addFilePathToStandbyQueue.type,
					removeFilePathFromProcessingQueue.type,
				),
				pluck('namespace'),
				filter(expectedNamespace => (
					expectedNamespace === namespace
				)),
				filter(() => (
					!(
						state$
						.value
						.downloadedFiles
						[
							payload
							.filePath
						]
					)
				)),
				mapTo(
					stopFilePathDownload({
						filePath: (
							payload
							.filePath
						),
					})
				),
				tap(dispatch),
			)
		)),
	)
)

export default downloadCancelationEpic
