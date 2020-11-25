import {
	map,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	removeDownloadedFile,
	removeImageDomElement,
} from './imageLoaderActions'

const imageDomElementCleanupEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(removeDownloadedFile.type),
		pluck('payload'),
		map(({
			filePath,
		}) => (
			removeImageDomElement({
				filePath,
			})
		)),
		tap(dispatch),
	)
)

export default imageDomElementCleanupEpic
