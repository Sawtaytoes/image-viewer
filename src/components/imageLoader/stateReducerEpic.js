import {
	from,
} from 'rxjs'
import {
	concatMap,
	reduce,
	tap,
} from 'rxjs/operators'

import reducers from './reducers'

const stateReducerEpic = (
	action$,
	state$,
) => (
	action$
	.pipe(
		concatMap(action => (
			from(reducers)
			.pipe(
				reduce(
					(
						state,
						{
							namespace,
							reducer,
						}
					) => ({
						...state,
						[namespace]: (
							reducer(
								(
									state
									[namespace]
								),
								(
									action
								),
							)
						),
					}),
					(
						state$
						.value
					),
				),
			)
		)),
		tap(state => {
			state$
			.next(
				state
			)
		}),
	)
)

export default stateReducerEpic
