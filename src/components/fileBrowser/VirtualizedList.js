import { css } from '@emotion/core'
import PropTypes from 'prop-types'
import {
	Children,
	memo,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

const scrollContainerStyles = css`
	height: auto;
	position: relative;
	width: 100%;
`

const virtualizedListStyles = css`
	height: 100%;
	overflow-x: hidden;
	overflow-y: auto;
	width: 100%;
`

const initialViewData = {
	containerHeight: 0,
	itemSize: 1,
	numberOfChildren: 0,
	numberOfDomElements: 0,
	numberOfImagesInView: 0,
	numberOfRows: 0,
}

const propTypes = {
	children: PropTypes.node.isRequired,
	itemPadding: PropTypes.string,
	numberOfColumns: PropTypes.number,
}

const VirtualizedList = ({
	children,
	itemPadding = '0',
	numberOfColumns = 1,
}) => {
	const animationFrameIdRef = useRef()
	const scrollContainerRef = useRef()
	const virtualizedListRef = useRef()

	useEffect(
		() => {
			virtualizedListRef
			.current
			.scrollTo(
				0,
				0,
			)
		},
		// While we care about this value, we're using `children` to listen for updates.
		[children],
	)

	const [
		scrollYPosition,
		setScrollYPosition,
	] = (
		useState(
			0
		)
	)

	const [
		viewData,
		setViewData,
	] = (
		useState(
			initialViewData
		)
	)

	useEffect(
		() => {
			const runCode = () => {
				const viewWidth = (
					virtualizedListRef
					.current
					.clientWidth
				)

				const viewHeight = (
					virtualizedListRef
					.current
					.clientHeight
				)

				const itemSize = (
					Math
					.ceil(
						viewWidth / numberOfColumns
					)
				)

				const numberOfImagesInView = (
					Math
					.ceil(
						(viewHeight / (viewWidth / numberOfColumns))
					)
					* numberOfColumns
				)

				const numberOfDomElements = (
					Math
					.ceil(
						numberOfImagesInView
						+ (
							numberOfImagesInView
							* (2 / numberOfColumns)
						)
					)
				)

				const numberOfChildren = (
					Children.count(children)
				)

				const numberOfRows = (
					Math.ceil(Children.count(children) / 4)
				)

				const containerHeight = (
					itemSize
					* numberOfRows
				)

				scrollContainerRef
				.current
				.style
				.setProperty(
					'height',
					`${containerHeight}px`,
				)

				setViewData({
					containerHeight,
					itemSize,
					numberOfChildren,
					numberOfDomElements,
					numberOfImagesInView,
					numberOfRows,
				})
			}

			const throttleCodeRunning = () => {
				if (animationFrameIdRef.current) {
					return
				}

				animationFrameIdRef
				.current = (
					window
					.requestAnimationFrame(() => {
						animationFrameIdRef
						.current = null

						runCode()
					})
				)
			}

			const resizeObserver = (
				new ResizeObserver(
					throttleCodeRunning
				)
			)

			resizeObserver
			.observe(
				virtualizedListRef
				.current
			)

			return () => {
				resizeObserver
				.disconnect()
			}
		},
		[
			children,
			numberOfColumns,
		],
	)

	useEffect(
		() => {
			const updateScrollPosition = () => {
				setScrollYPosition(
					virtualizedListRef
					.current
					.scrollTop
				)
			}

			const throttleScrollPositionUpdate = () => {
				if (animationFrameIdRef.current) {
					return
				}

				animationFrameIdRef
				.current = (
					window
					.requestAnimationFrame(() => {
						animationFrameIdRef
						.current = null

						updateScrollPosition()
					})
				)
			}

			virtualizedListRef
			.current
			.addEventListener(
				'scroll',
				throttleScrollPositionUpdate,
			)

			return () => {
				virtualizedListRef
				.current
				.removeEventListener(
					'scroll',
					throttleScrollPositionUpdate,
				)
			}
		},
		[
			children,
			numberOfColumns,
		],
	)

	const virtualizedListItemStyles = (
		useMemo(
			() => (
				css`
					flex: 0 0 calc((1 / ${numberOfColumns}) * 100%);
					padding: ${itemPadding};
					position: absolute;
					width: calc((1 / ${numberOfColumns}) * 100%);
				`
			),
			[
				itemPadding,
				numberOfColumns,
			],
		)
	)

	const virtualizedChildren = (
		useMemo(
			() => {
				const {
					itemSize,
					numberOfImagesInView,
				} = viewData

				const startingIndex = (
					Math
					.floor(
						scrollYPosition / itemSize
					)
					* numberOfColumns
				)

				return (
					Children
					.toArray(
						children
					)
					.slice(
						startingIndex,
						(
							startingIndex
							+ numberOfImagesInView
						),
					)
					.map((
						childElement,
						index,
					) => ({
						childElement,
						shiftedIndex: (
							index
							+ startingIndex
						),
					}))
					.map(({
						childElement,
						shiftedIndex,
					}) => ({
						childElement,
						id: shiftedIndex,
						styles: (
							css`
								${virtualizedListItemStyles}
								left: ${(shiftedIndex % numberOfColumns) * itemSize}px;
								top: ${Math.floor(shiftedIndex / numberOfColumns) * itemSize}px;
							`
						),
					}))
					.map(({
						childElement,
						id,
						styles,
					}) => (
						<div
							css={styles}
							key={id}
						>
							{childElement}
						</div>
					))
				)
			},
			[
				children,
				numberOfColumns,
				scrollYPosition,
				viewData,
				virtualizedListItemStyles,
			],
		)
	)

	return (
		<div
			css={virtualizedListStyles}
			ref={virtualizedListRef}
		>
			<div
				css={scrollContainerStyles}
				ref={scrollContainerRef}
			>
				{virtualizedChildren}
			</div>
		</div>
	)
}

VirtualizedList.propTypes = propTypes

const MemoizedVirtualizedList = memo(VirtualizedList)

export default MemoizedVirtualizedList
