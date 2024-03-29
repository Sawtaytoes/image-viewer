import { css } from '@emotion/react'
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

const virtualizedListStyles = css`
	height: auto;
	position: relative;
	width: 100%;
`

const selectedListItemStyles = css`
	border: 4px dotted lightgray;
`

const scrollContainerStyles = css`
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
	children: PropTypes
	.node
	.isRequired,
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

	useLayoutEffect(
		() => {
			const calculateViewData = () => {
				const viewWidth = (
					scrollContainerRef
					.current
					.clientWidth
				)

				const viewHeight = (
					scrollContainerRef
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
						) / numberOfColumns
					)
				)

				const containerHeight = (
					itemSize
					* numberOfRows
				)

				virtualizedListRef
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
				scrollContainerRef
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

	useLayoutEffect(
		() => {
			const {
				itemSize,
				numberOfChildren,
			} = (
				viewData
			)

			const clampedIndex = (
				Math
				.min(
					(
						numberOfChildren
						- 1
					),
					(
						Math
						.max(
							0,
							selectedIndex,
						)
					),
				)
			)

			const itemTopPosition = (
				Math
				.floor(
					(
						clampedIndex
					) / numberOfColumns
				)
				* itemSize
			)

			const itemBottomPosition = (
				itemTopPosition
				+ itemSize
			)

			const viewTop = (
				scrollContainerRef
				.current
				.scrollTop
			)

			const viewHeight = (
				scrollContainerRef
				.current
				.clientHeight
			)

			const viewBottom = (
				viewTop
				+ viewHeight
			)

			if (
				itemTopPosition
				< viewTop
			) {
				const scrollYPosition = (
					itemTopPosition
				)

				scrollContainerRef
				.current
				.scrollTo(
					0,
					scrollYPosition,
				)
			}

			if (
				itemBottomPosition
				> viewBottom
			) {
				const scrollYPosition = (
					viewTop
					+ (
						itemBottomPosition
						- viewBottom
					)
				)

				scrollContainerRef
				.current
				.scrollTo(
					0,
					scrollYPosition,
				)
			}
		},
		[
			numberOfColumns,
			selectedIndex,
			viewData,
		],
	)

	useEffect(
		() => {
			const updateScrollPosition = () => {
				setScrollYPosition(
					scrollContainerRef
					.current
					.scrollTop
				)
			}

			const throttleScrollPositionUpdate = () => {
				if (animationFrameIdRef
				.current) {
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

			scrollContainerRef
			.current
			.addEventListener(
				'scroll',
				throttleScrollPositionUpdate,
			)

			return () => {
				scrollContainerRef
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
					filter: drop-shadow(3px 3px 4px #222);
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

								${
							shiftedIndex === selectedIndex
									&& selectedListItemStyles
							}
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
				selectedIndex,
				viewData,
				virtualizedListItemStyles,
			],
		)
	)

	return (
		<div
			css={scrollContainerStyles}
			ref={scrollContainerRef}
		>
			<div
				css={virtualizedListStyles}
				ref={virtualizedListRef}
			>
				{virtualizedChildren}
			</div>
		</div>
	)
}

VirtualizedList.propTypes = propTypes

const MemoizedVirtualizedList = memo(VirtualizedList)

export default MemoizedVirtualizedList
