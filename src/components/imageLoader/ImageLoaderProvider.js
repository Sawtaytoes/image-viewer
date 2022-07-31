import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
} from 'react'

import ImageLoaderContext from './ImageLoaderContext'
import {
	addFilePath,
	removeFilePath,
} from './imageLoaderActions'
import {
	createStateObservable,
	dispatchReduxAction,
	reduxObservable$,
} from './createdReduxObservable'

const propTypes = {
	children: PropTypes
	.node
	.isRequired,
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

	const unloadImage = (
		useCallback(
			({
				filePath,
			}) => {
				dispatchReduxAction(
					removeFilePath({
						filePath,
					})
				)
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
				createStateObservable,
				unloadImage,
				updateImageVisibility,
			}),
			[
				unloadImage,
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
