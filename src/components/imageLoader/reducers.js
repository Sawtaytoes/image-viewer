// import downloadedBlobsReducer from './downloadedBlobsReducer'
import downloadedFilesReducer from './downloadedFilesReducer'
import downloadPercentagesReducer from './downloadPercentagesReducer'
import filePathsQueueReducer from './filePathsQueueReducer'
import imageDomElementsReducer from './imageDomElementsReducer'
import priorityQueueReducer from './priorityQueueReducer'
import processingQueueReducer from './processingQueueReducer'
import standbyQueueReducer from './standbyQueueReducer'

const reducers = [
	// {
	// 	namespace: 'downloadedBlobs',
	// 	reducer: downloadedBlobsReducer,
	// },
	{
		namespace: 'downloadedFiles',
		reducer: downloadedFilesReducer,
	},
	{
		namespace: 'downloadPercentages',
		reducer: downloadPercentagesReducer,
	},
	{
		namespace: 'filePathsQueue',
		reducer: filePathsQueueReducer,
	},
	{
		namespace: 'imageDomElements',
		reducer: imageDomElementsReducer,
	},
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
