import {
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
