import { catchError } from 'rxjs/operators'
import { of } from 'rxjs'

const catchEpicError = epicName => (
	catchError(error => {
		console
		.error(
			(
				epicName
			),
			(
				error.constructor.name === 'ErrorEvent'
				? error.error.stack
				: error
			),
		)

		return (
			of({
				epicName,
				error,
				type: 'CAUGHT_ERROR',
			})
		)
	})
)

export default catchEpicError
