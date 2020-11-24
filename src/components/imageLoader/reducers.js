import downloadedFilesReducer from './downloadedFilesReducer'
import downloadPercentagesReducer from './downloadPercentagesReducer'
// import imageDomElementsReducer from './imageDomElementsReducer'
import priorityQueueReducer from './priorityQueueReducer'
import processingQueueReducer from './processingQueueReducer'
import standbyQueueReducer from './standbyQueueReducer'

const reducers = [
	{
		namespace: 'downloadedFiles',
		reducer: downloadedFilesReducer,
	},
	{
		namespace: 'downloadPercentages',
		reducer: downloadPercentagesReducer,
	},
	// {
	// 	namespace: 'imageDomElements',
	// 	reducer: imageDomElementsReducer,
	// },
	{
		namespace: 'priorityQueue',
		reducer: priorityQueueReducer,
	},
	{
		namespace: 'processingQueue',
		reducer: processingQueueReducer,
	},
	{
		namespace: 'standbyQueue',
		reducer: standbyQueueReducer,
	},
]

const initialAction = {}

export const initialState = (
	reducers
	.reduce(
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
						initialAction
					),
				)
			),
		}),
		{},
	)
)

export default reducers
