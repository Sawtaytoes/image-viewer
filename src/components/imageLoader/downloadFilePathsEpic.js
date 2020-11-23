import {
	endWith,
	filter,
	map,
	mergeAll,
	mergeMap,
	takeUntil,
	pluck,
	tap,
} from 'rxjs/operators'

import createFileDownloadObservable from './createFileDownloadObservable'
import ofType from './ofType'
import {
	addDownloadedFile,
	finishedFilePathDownload,
	startFilePathDownload,
	stopFilePathDownload,
	updateDownloadPercentage,
} from './imageLoaderActions'

const downloadFilePathsEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(startFilePathDownload.type),
		map(({
			namespace,
			payload,
		}) => ({
			filePath: (
				payload
				.filePath
			),
			namespace,
		})),
		mergeMap(({
			filePath,
			namespace,
		}) => (
			createFileDownloadObservable(
				filePath
			)
			.pipe(
				takeUntil(
					action$
					.pipe(
						ofType(stopFilePathDownload.type),
						pluck('namespace'),
						filter(expectedNamespace => (
							expectedNamespace === namespace
						)),
					)
				),
				map(({
					downloadPercentage,
					fileBlobUrl,
				}) => ([
					(
						typeof downloadPercentage === 'number'
						&& (
							updateDownloadPercentage({
								downloadPercentage,
								filePath,
							})
						)
					),
					(
						fileBlobUrl
						&& (
							addDownloadedFile({
								fileBlobUrl,
								filePath,
							})
						)
					),
				])),
				mergeAll(),
				filter(Boolean),
				endWith(
					finishedFilePathDownload({
						filePath,
					})
				),
				tap(dispatch),
			)
		)),
	)
)

export default downloadFilePathsEpic
