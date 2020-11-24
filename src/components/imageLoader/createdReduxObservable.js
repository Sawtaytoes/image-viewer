import addFilePathEpic from './addFilePathEpic'
import downloadFileCancelationEpic from './downloadFileCancelationEpic'
import downloadFileCompletionEpic from './downloadFileCompletionEpic'
import downloadFileEpic from './downloadFileEpic'
import downloadFilePathsEpic from './downloadFilePathsEpic'
import processQueueEpic from './processQueueEpic'
import removeFilePathEpic from './removeFilePathEpic'
import stateReducerEpic from './stateReducerEpic'
import { createReduxObservable } from './reduxObservable'

import { initialState } from './reducers'

export const {
	createStateObservable,
	dispatchReduxAction,
	onHotReload,
	reduxObservable$,
} = (
	createReduxObservable({
		epics: [
			stateReducerEpic, // This has to be first to initialize `state$`.
			addFilePathEpic,
			downloadFileCancelationEpic,
			downloadFileCompletionEpic,
			downloadFileEpic,
			downloadFilePathsEpic,
			processQueueEpic,
			removeFilePathEpic,
		],
		initialState,
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
