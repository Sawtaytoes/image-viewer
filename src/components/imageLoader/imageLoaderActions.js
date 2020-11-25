import createActionCreator from './createActionCreator'
import createNamespaceActionCreator from './createNamespaceActionCreator'

export const addDownloadedFile = (
	createNamespaceActionCreator({
		actionType: 'addDownloadedFile',
		namespaceIdentifier: 'filePath',
	})
)

export const addFilePath = (
	createActionCreator({
		actionType: 'addFilePath',
	})
)

export const addFilePathToQueue = (
	createNamespaceActionCreator({
		actionType: 'addFilePathToQueue',
	})
)

export const addFilePathToPriorityQueue = (
	createNamespaceActionCreator({
		actionType: 'addFilePathToPriorityQueue',
		namespaceIdentifier: 'filePath',
	})
)

export const addFilePathToProcessingQueue = (
	createNamespaceActionCreator({
		actionType: 'addFilePathToProcessingQueue',
		namespaceIdentifier: 'filePath',
	})
)

export const addFilePathToStandbyQueue = (
	createNamespaceActionCreator({
		actionType: 'addFilePathToStandbyQueue',
		namespaceIdentifier: 'filePath',
	})
)

export const addImageDomElement = (
	createNamespaceActionCreator({
		actionType: 'addImageDomElement',
		namespaceIdentifier: 'filePath',
	})
)

export const finishedFilePathDownload = (
	createNamespaceActionCreator({
		actionType: 'finishedFilePathDownload',
		namespaceIdentifier: 'filePath',
	})
)

export const removeDownloadedFile = (
	createNamespaceActionCreator({
		actionType: 'removeDownloadedFile',
		namespaceIdentifier: 'filePath',
	})
)

export const removeFilePath = (
	createActionCreator({
		actionType: 'removeFilePath',
	})
)

export const removeFilePathFromQueue = (
	createNamespaceActionCreator({
		actionType: 'removeFilePathFromQueue',
	})
)

export const removeFilePathFromPriorityQueue = (
	createNamespaceActionCreator({
		actionType: 'removeFilePathFromPriorityQueue',
		namespaceIdentifier: 'filePath',
	})
)

export const removeFilePathFromProcessingQueue = (
	createNamespaceActionCreator({
		actionType: 'removeFilePathFromProcessingQueue',
		namespaceIdentifier: 'filePath',
	})
)

export const removeFilePathFromStandbyQueue = (
	createNamespaceActionCreator({
		actionType: 'removeFilePathFromStandbyQueue',
		namespaceIdentifier: 'filePath',
	})
)

export const removeImageDomElement = (
	createNamespaceActionCreator({
		actionType: 'removeImageDomElement',
		namespaceIdentifier: 'filePath',
	})
)

export const resetDownloadedPercentage = (
	createNamespaceActionCreator({
		actionType: 'resetDownloadedPercentage',
		namespaceIdentifier: 'filePath',
	})
)

export const startFilePathDownload = (
	createNamespaceActionCreator({
		actionType: 'startFilePathDownload',
		namespaceIdentifier: 'filePath',
	})
)

export const stopFilePathDownload = (
	createNamespaceActionCreator({
		actionType: 'stopFilePathDownload',
		namespaceIdentifier: 'filePath',
	})
)

export const updateDownloadPercentage = (
	createNamespaceActionCreator({
		actionType: 'updateDownloadPercentage',
		namespaceIdentifier: 'filePath',
	})
)
