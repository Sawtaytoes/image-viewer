import {
	fromEvent,
} from 'rxjs'
import {
	filter,
	map,
	mapTo,
	mergeMap,
	pluck,
	take,
	takeUntil,
	tap,
} from 'rxjs/operators'

import ofType from './ofType'
import {
	addDownloadedFile,
	addImageDomElement,
	removeImageDomElement,
} from './imageLoaderActions'

const imageDomElementLoaderEpic = (
	action$,
	state$,
	{ dispatch },
) => (
	action$
	.pipe(
		ofType(addDownloadedFile
		.type),
		pluck('payload'),
		map(({
			fileBlobUrl,
			filePath,
		}) => {
			const imageDomElement = (
				document
				.createElement('img')
			)

			imageDomElement
			.setAttribute(
				'src',
				fileBlobUrl,
			)

			return {
				filePath,
				imageDomElement,
			}
		}),
		mergeMap(({
			filePath,
			imageDomElement,
		}) => (
			fromEvent(
				imageDomElement,
				'load',
			)
			.pipe(
				takeUntil(
					action$
					.pipe(
						ofType(removeImageDomElement
						.type),
						filter(({
							namespace,
						}) => (
							namespace === filePath
						))
					)
				),
				take(1),
				mapTo(
					addImageDomElement({
						filePath,
						imageDomElement,
					})
				)
			)
		)),
		tap(dispatch),
	)
)

export default imageDomElementLoaderEpic
