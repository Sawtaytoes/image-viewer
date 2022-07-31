import path from 'path'
import {
	BehaviorSubject,
	from,
	Observable,
	Subject,
} from 'rxjs'
import {
	distinctUntilChanged,
	filter,
	map,
	mergeAll,
	mergeMap,
	scan,
	startWith,
	switchMap,
} from 'rxjs/operators'

import catchEpicError from './catchEpicError'

const isLocalDevelopment = (
	true
	// config
	// .get(
	// 	'isLocalDevelopment'
	// )
)

export const createReduxObservable = ({
	dependencies = {},
	epics,
	initialState = {},
}) => {
	const action$ = new Subject()

	const dispatchReduxAction = action => {
		action$
		.next(action)

		return action
	}

	const state$ = (
		new BehaviorSubject(
			initialState
		)
	)

	const hotReload$ = (
		new BehaviorSubject([])
	)

	const createStateObservable = stateSelector => (
		Observable
		.create(observer => {
			const subscriber = (
				state$
				.pipe(
					map(stateSelector),
					scan(
						(
							previousState,
							nextState,
						) => {
							const isStateChanged = (
								Array
								.from(
									new Set([
										...(
											Object
											.keys(
												previousState,
											)
										),
										...(
											Object
											.keys(
												nextState,
											)
										),
									])
								)
								.some(stateKey => (
									!(
										Object
										.is(
											previousState
											[stateKey],
											nextState
											[stateKey],
										)
									)
								))
							)

							return (
								isStateChanged
								? nextState
								: previousState
							)
						},
						initialState,
					),
					distinctUntilChanged(),
				)
				.subscribe(state => {
					observer
					.next(
						state
					)
				})
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		})
	)

	const onHotReload = changedFilePaths => {
		hotReload$
		.next(changedFilePaths)
	}

	if (isLocalDevelopment) {
		window
		.dispatchReduxAction = (
			dispatchReduxAction
		)

		// action$
		// .subscribe(action => (
		// 	console.info(
		// 		'[ACTION]',
		// 		action,
		// 	)
		// ))

		window
		.state$ = state$
	}

	const epicDependencies = {
		...dependencies,
		createStateObservable,
		dispatch: dispatchReduxAction,
	}

	return {
		createStateObservable,
		dispatchReduxAction,
		onHotReload,
		reduxObservable$: (
			from(epics)
			.pipe(
				filter(epic => (
					!(
						Object
						.is(
							typeof epic,
							'boolean',
						)
					)
				)),
				mergeMap(epic => (
					hotReload$
					.pipe(
						mergeAll(),
						filter(changedFilePath => (
							Object
							.is(
								(
									path
									.basename(
										changedFilePath,
										'.js'
									)
								),
								(
									epic
									.name
								),
							)
						)),
						startWith(null),
						switchMap(() => (
							epic(
								action$,
								state$,
								epicDependencies,
							)
							.pipe(
								catchEpicError(
									epic
									.name
								),
							)
						))
					)
				)),
				catchEpicError(
					'rootEpic'
				),
			)
		),
	}
}
