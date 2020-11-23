import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
} from 'react'

import ImageLoaderContext from './ImageLoaderContext'
import { addFilePath } from './imageLoaderActions'
import {
	createStateObservable,
	dispatchReduxAction,
	reduxObservable$,
} from './createdReduxObservable'

const propTypes = {
	children: PropTypes.node.isRequired,
}

const ImageLoaderProvider = ({
	children,
}) => {
	useEffect(
		() => {
			const subscriber = (
				reduxObservable$
				.subscribe()
			)

			return () => {
				subscriber
				.unsubscribe()
			}
		},
		[],
	)

	const clearDownloadQueue = (
		useCallback(
			() => {
				// >>> Dispatch some actions
			},
			[],
		)
	)

	const updateImageVisibility = (
		useCallback(
			({
				filePath,
				isVisible,
			}) => {
				dispatchReduxAction(
					addFilePath({
						filePath,
						isVisible,
					})
				)
			},
			[],
		)
	)

	const imageLoaderProviderValue = (
		useMemo(
			() => ({
				clearDownloadQueue,
				createStateObservable,
				updateImageVisibility,
			}),
			[
				clearDownloadQueue,
				updateImageVisibility,
			],
		)
	)

	return (
		<ImageLoaderContext.Provider
			value={imageLoaderProviderValue}
		>
			{children}
		</ImageLoaderContext.Provider>
	)
}

ImageLoaderProvider.propTypes = propTypes

const MemoizedImageViewerProvider = memo(ImageLoaderProvider)

export default MemoizedImageViewerProvider
