import { css } from '@emotion/core'
import PropTypes from 'prop-types'
import {
	Children,
	memo,
	useEffect,
	useLayoutEffect,
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
	itemSize: 1,
	numberOfChildren: 0,
	numberOfItemsInView: 0,
}

const propTypes = {
	children: PropTypes.node.isRequired,
	itemPadding: PropTypes.string,
	numberOfColumns: PropTypes.number,
	selectedIndex: PropTypes.number,
}

const VirtualizedList = ({
	children,
	itemPadding = '0',
	numberOfColumns = 1,
	selectedIndex = 0,
}) => {
	const animationFrameIdRef = useRef()
	const scrollContainerRef = useRef()
	const virtualizedListRef = useRef()

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

	const numberOfColumnsRef = useRef()

	numberOfColumnsRef
	.current = (
		numberOfColumns
	)

	const viewDataRef = useRef()

	viewDataRef
	.current = (
		viewData
	)

	useLayoutEffect(
		() => {
			const {
				itemSize,
			} = (
				viewDataRef
				.current
			)

			virtualizedListRef
			.current
			.scrollTo(
				0,
				(
					Math
					.floor(
						(
							Math
							.max(
								0,
								selectedIndex,
							)
						) / numberOfColumnsRef.current
					)
					* itemSize
				),
			)
		},
		[
			children, // We're using `children` to listen for updates.
			selectedIndex,
		],
	)

	useEffect(
		() => {
			const calculateViewData = () => {
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

				const numberOfItemsInView = (
					Math
					.ceil(
						(viewHeight / (viewWidth / numberOfColumns))
					)
					* numberOfColumns
				)

				const numberOfChildren = (
					Children
					.count(children)
				)

				const numberOfRows = (
					Math
					.ceil(
						Children
						.count(
							children
						) / 4
					)
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
					itemSize,
					numberOfChildren,
					numberOfItemsInView,
				})
			}

			const throttleViewDataCalculation = () => {
				if (
					animationFrameIdRef
					.current
				) {
					return
				}

				animationFrameIdRef
				.current = (
					window
					.requestAnimationFrame(() => {
						animationFrameIdRef
						.current = null

						calculateViewData()
					})
				)
			}

			const resizeObserver = (
				new ResizeObserver(
					throttleViewDataCalculation
				)
			)

			resizeObserver
			.observe(
				virtualizedListRef
				.current
			)

			return () => {
				window
				.cancelAnimationFrame(
					animationFrameIdRef
					.current
				)

				animationFrameIdRef
				.current = null

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
				.current // eslint-disable-line react-hooks/exhaustive-deps
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
					numberOfChildren,
					numberOfItemsInView,
				} = viewData

				const numberOfRowsToPad = 8

				const numberOfItemsToPad = (
					numberOfRowsToPad
					* numberOfColumns
				)

				const numberOfItemsToRender = (
					numberOfItemsInView
					+ numberOfItemsToPad
				)

				const startingOffset = (
					(
						Math
						.floor(
							scrollYPosition / itemSize
						)
						* numberOfColumns
					)
					- (numberOfItemsToPad / 2)
				)

				const endingOffset = (
					startingOffset
					+ numberOfItemsToRender
				)

				const isStartingOffsetOutOfBounds = (
					startingOffset
					< 0
				)

				const isEndingOffsetOutOfBounds = (
					endingOffset
					> numberOfChildren
				)

				const startingIndex = (
					isEndingOffsetOutOfBounds
					? (
						Math
						.max(
							0,
							(
								numberOfChildren
								- numberOfItemsToRender
							)
						)
					)
					: (
						isStartingOffsetOutOfBounds
						? 0
						: startingOffset
					)
				)

				const endingIndex = (
					isStartingOffsetOutOfBounds
					? numberOfItemsToRender
					: (
						isEndingOffsetOutOfBounds
						? numberOfChildren
						: endingOffset
					)
				)

				return (
					Children
					.toArray(
						children
					)
					.slice(
						startingIndex,
						endingIndex,
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
