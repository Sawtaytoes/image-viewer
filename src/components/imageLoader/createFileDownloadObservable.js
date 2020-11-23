import { Observable } from 'rxjs'

const createFileDownloadObservable = filePath => (
	Observable
	.create(observer => {
		const updateProgress = event => {
			observer
			.next({
				downloadPercentage: (
					Math.round(
						(event.loaded / event.total)
						* 100
					)
				),
				filePath,
			})
		}

		const saveImageDataUrl = function() {
			if (
				!xmlHttpRequest
				.status
				.toString()
				.match(/^2/)
			) {
				return
			}

			const headers = (
				xmlHttpRequest
				.getAllResponseHeaders()
			)

			const mimeType = (
				headers
				.replace(
					/^Content-Type:\s*(.*?)$/mi,
					'$1',
				)
			)

			const fileBlob = (
				new Blob(
					[this.response],
					{ type: mimeType }
				)
			)

			const fileBlobUrl = (
				URL
				.createObjectURL(
					fileBlob
				)
			)

			observer
			.next({
				fileBlobUrl,
			})

			observer
			.complete()
		}

		const xmlHttpRequest = (
			new XMLHttpRequest()
		)

		const webSafeFilePath = (
			filePath
			.replace(
				'#',
				'%23',
			)
		)

		xmlHttpRequest
		.open(
			'GET',
			webSafeFilePath,
			true,
		)

		xmlHttpRequest
		.responseType = 'arraybuffer'

		xmlHttpRequest
		.addEventListener(
			'progress',
			updateProgress,
		)

		xmlHttpRequest
		.addEventListener(
			'loadend',
			saveImageDataUrl,
		)

		xmlHttpRequest
		.send()

		return () => {
			xmlHttpRequest
			.abort()

			xmlHttpRequest
			.removeEventListener(
				'progress',
				updateProgress,
			)

			xmlHttpRequest
			.removeEventListener(
				'loadend',
				saveImageDataUrl,
			)
		}
	})
)

export default createFileDownloadObservable
