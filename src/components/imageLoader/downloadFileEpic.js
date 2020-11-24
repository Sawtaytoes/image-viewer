import {
	map,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	addFilePathToProcessingQueue,
	startFilePathDownload,
} from './imageLoaderActions'

const downloadFileEpic = (
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
		}) => (
			startFilePathDownload({
				filePath,
			})
		)),
		tap(dispatch),
	)
)

export default downloadFileEpic
