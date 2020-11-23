import {
	interval,
} from 'rxjs'
import {
	distinctUntilChanged,
	filter,
	map,
	mergeAll,
	pluck,
	startWith,
	takeUntil,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	finishedFilePathDownload,
	startFilePathDownload,
	stopFilePathDownload,
} from './imageLoaderActions'

const downloadQueueEpic = (
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
		)),
		mergeAll(),
		tap(console.log),
		map(filePath => (
			interval(999999)
			.pipe(
				takeUntil(
					action$
					.pipe(
						ofType(
							finishedFilePathDownload.type,
							stopFilePathDownload.type,
						),
						tap(console.log),
						pluck('namespace'),
						filter(expectedNamespace => (
							expectedNamespace === filePath
						)),
					)
				),
				startWith(
					startFilePathDownload({
						filePath,
					})
				),
				tap(() => {
					console.log(
						'downloading',
						filePath
					)
				}),
				tap(dispatch),
			)
		)),
		mergeAll(4),
	)
)

export default downloadQueueEpic
