import {
	from,
} from 'rxjs'
import {
	concatMap,
	reduce,
	startWith,
	tap,
} from 'rxjs/operators'

import reducers from './reducers'

const initialAction = {}

const stateReducerEpic = (
	action$,
	state$,
) => (
	action$
	.pipe(
		startWith(
			initialAction
		),
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
