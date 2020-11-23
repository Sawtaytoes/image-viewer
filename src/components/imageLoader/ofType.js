import { pipe } from 'rxjs'
import { filter } from 'rxjs/operators'

const ofType = (
	...requiredTypes
) => (
	pipe(
		filter(Boolean),
		filter(action => (
			action
			.type
		)),
		filter(({
			type,
		}) => (
			requiredTypes
			.includes(type)
		)),
	)
)

export default ofType
