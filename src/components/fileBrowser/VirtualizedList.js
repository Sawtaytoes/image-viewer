import { css } from '@emotion/core'
import PropTypes from 'prop-types'
import {
	Children,
	// cloneElement,
	memo,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

// {
// 	directories
// 	.map(({
// 		name,
// 		path,
// 	}) => (
// 		<div
// 			css={fileStyles}
// 			key={path}
// 		>
// 			<Directory
// 				directoryName={name}
// 				directoryPath={path}
// 			/>
// 		</div>
// 	))
// }

// {
// 	imageFiles
// 	.map(({
// 		name,
// 		path,
// 	}) => (
// 		<div
// 			css={fileStyles}
// 			key={path}
// 		>
// 			<ImageFile
// 				fileName={name}
// 				filePath={path}
// 			/>
// 		</div>
// 	))
// }

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
	itemSize: 0,
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

	const [
		viewData,
		setViewData,
	] = (
		useState(
			initialViewData
		)
	)

	console.log(
		'viewData',
		viewData,
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

			const onScroll = event => {
				// console.log(event)
			}

			virtualizedListRef
			.current
			.addEventListener(
				'scroll',
				onScroll,
			)

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

				virtualizedListRef
				.current
				.removeEventListener(
					'scroll',
					onScroll,
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
			() => (
				Children
				.toArray(
					children
				)
				// .slice(
				// 	0,
				// 	(
				// 		viewData
				// 		.numberOfDomElements
				// 	),
				// )
				.map((
					childElement,
					index,
				) => ({
					childElement,
					key: index,
					styles: (
						css`
							${virtualizedListItemStyles}
							left: ${(index % numberOfColumns) * viewData.itemSize}px;
							top: ${Math.floor(index / numberOfColumns) * viewData.itemSize}px;
						`
					),
				}))
				.filter(t => (
					console.log(t)
					|| t
				))
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
			),
			[
				children,
				numberOfColumns,
				viewData,
				virtualizedListItemStyles,
			],
		)
	)

	console.log(Children.count(virtualizedChildren))

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
