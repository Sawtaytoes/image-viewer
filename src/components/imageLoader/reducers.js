import downloadedFilesReducer from './downloadedFilesReducer'
import downloadPercentageReducer from './downloadPercentageReducer'
import processingQueueReducer from './processingQueueReducer'
import standbyQueueReducer from './standbyQueueReducer'

const reducers = [
	{
		namespace: 'downloadedFiles',
		reducer: downloadedFilesReducer,
	},
	{
		namespace: 'downloadPercentage',
		reducer: downloadPercentageReducer,
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

export default reducers
