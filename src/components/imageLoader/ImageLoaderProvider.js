import PropTypes from 'prop-types'
import {
	memo,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'

import createObservable from './createObservable'
import ImageLoaderContext from './ImageLoaderContext'

const moveItemToArray = ({
	itemValue,
	receivingArray,
	transmittingArray,
}) => {
	const matchingIndex = (
		transmittingArray
		.findIndex(arrayValue => (
			Object
			.is(
				arrayValue,
				itemValue,
			)
		))
	)

	return {
		receivingArray: (
			receivingArray
			.concat(
				matchingIndex === -1
				? (
					itemValue
				)
				: (
					transmittingArray
					[matchingIndex]
				)
			)
		),
		transmittingArray: (
			matchingIndex === -1
			? (
				transmittingArray
			)
			: (
				transmittingArray
				.slice(
					0,
					matchingIndex,
				)
				.concat(
					transmittingArray
					.slice(
						matchingIndex + 1
					)
				)
			)
		),
	}
}

const queueSlotStates = {
	available: 'available',
	unavailable: 'unavailable',
}

const initialQueueSlots = {
	slot1: queueSlotStates.available,
	slot2: queueSlotStates.available,
	slot3: queueSlotStates.available,
	slot4: queueSlotStates.available,
}

const initialArray = []

const propTypes = {
	children: PropTypes.node.isRequired,
}

const ImageLoaderProvider = ({
	children,
}) => {
	const loadedImagesRef = (
		useRef(
			initialArray
		)
	)

	const queuedImagesRef = (
		useRef(
			initialArray
		)
	)

	const unqueuedImagesRef = (
		useRef(
			initialArray
		)
	)

	const queueSlotsRef = (
		useRef(
			initialQueueSlots
		)
	)

	const clearDownloadQueue = (
		useCallback(
			() => {
				loadedImagesRef.current = (
					initialArray
				)

				queuedImagesRef.current = (
					initialArray
				)

				unqueuedImagesRef.current = (
					initialArray
				)

				queueSlotsRef.current = (
					initialQueueSlots
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
				console.log({
					filePath,
					isVisible,
				})

				if (isVisible) {
					const {
						receivingArray,
						transmittingArray,
					} = (
						moveItemToArray({
							itemValue: filePath,
							receivingArray: queuedImagesRef.current,
							transmittingArray: unqueuedImagesRef.current,
						})
					)

					unqueuedImagesRef.current = transmittingArray
					queuedImagesRef.current = receivingArray
				}
				else {
					const {
						receivingArray,
						transmittingArray,
					} = (
						moveItemToArray({
							itemValue: filePath,
							receivingArray: unqueuedImagesRef.current,
							transmittingArray: queuedImagesRef.current,
						})
					)

					queuedImagesRef.current = transmittingArray
					unqueuedImagesRef.current = receivingArray
				}

				console.log('=========================')
				console.log(queuedImagesRef.current)
				console.log(unqueuedImagesRef.current)
			},
			[],
		)
	)

	const imageLoaderProviderValue = (
		useMemo(
			() => ({
				clearDownloadQueue,
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
