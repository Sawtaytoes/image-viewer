import {
	filter,
	map,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	addFilePath,
	addFilePathToProcessingQueue,
	addFilePathToStandbyQueue,
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
			isVisible,
		}) => (
			isVisible
			? (
				addFilePathToProcessingQueue({
					filePath,
				})
			)
			: (
				addFilePathToStandbyQueue({
					filePath,
				})
			)
		)),
		tap(dispatch),
	)
)

export default addFilePathEpic
