import {
	filter,
	map,
	pluck,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	resetDownloadedPercentage,
	stopFilePathDownload,
} from './imageLoaderActions'

const downloadFileCancelationEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(stopFilePathDownload
		.type),
		pluck('payload'),
		map(({
			filePath,
		}) => ({
			downloadPercentage: (
				state$
				.value
				.downloadPercentages
				[filePath]
			),
			filePath,
		})),
		map(({
			downloadPercentage,
			filePath,
		}) => (
			typeof downloadPercentage === 'number'
			&& (
				resetDownloadedPercentage({
					downloadPercentage,
					filePath,
				})
			)
		)),
		filter(Boolean),
		tap(dispatch),
	)
)

export default downloadFileCancelationEpic
