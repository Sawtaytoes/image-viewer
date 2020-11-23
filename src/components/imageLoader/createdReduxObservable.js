import addFilePathEpic from './addFilePathEpic'
import downloadFilePathsEpic from './downloadFilePathsEpic'
import stateReducerEpic from './stateReducerEpic'
import { createReduxObservable } from './reduxObservable'

export const {
	dispatchReduxAction,
	onHotReload,
	reduxObservable$,
	subscribeToState,
} = (
	createReduxObservable({
		epics: [
			addFilePathEpic,
			downloadFilePathsEpic,
			stateReducerEpic,
		],
	})
)

if (
	module
	.hot
) {
	const filesToWatch = (
		require
		.context(
			'./',
			true,
			/\.js$/
		)
		.keys()
		.filter(filePath => {
			const lowerCaseFilePath = (
				filePath
				.toLowerCase()
			)

			return (
				(
					lowerCaseFilePath
					.includes('actions')
				)
				|| (
					lowerCaseFilePath
					.includes('epic')
				)
				|| (
					lowerCaseFilePath
					.includes('observable')
				)
				|| (
					lowerCaseFilePath
					.includes('reducer')
				)
				|| (
					lowerCaseFilePath
					.includes('redux')
				)
				|| (
					lowerCaseFilePath
					.includes('selectors')
				)
			)
		})
	)

	module
	.hot
	.accept(
		filesToWatch,
		onHotReload,
	)
}
