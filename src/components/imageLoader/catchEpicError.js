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
				'\n'
			),
			(
				error
				.constructor
				.name === 'ErrorEvent'
				? error
				.error
				.stack
				: error
			),
		)

		return (
			of({
				epicName,
				error,
				type: 'caughtError',
			})
		)
	})
)

export default catchEpicError
