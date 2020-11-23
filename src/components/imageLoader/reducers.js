import downloadedFilesReducer from './downloadedFilesReducer'
import downloadPercentagesReducer from './downloadPercentagesReducer'
// import imageDomElementsReducer from './imageDomElementsReducer'
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
		namespace: 'processingQueue',
		reducer: processingQueueReducer,
	},
	{
		namespace: 'standbyQueue',
		reducer: standbyQueueReducer,
	},
]

export default reducers
