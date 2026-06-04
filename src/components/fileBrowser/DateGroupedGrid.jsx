import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

// Windowed grid that lays each date group out as a full-width header followed
// by its items in an N-column grid. Unlike `VirtualizedList` (a single uniform
// grid indexed by position), rows here are mixed-height — header rows and item
// rows — so it carries its own absolute-position layout. Only placements inside
// the viewport (plus a small pad) render, so large folders stay light even
// though every folder tile fetches its own preview listing.

const HEADER_HEIGHT = 40

const ROWS_TO_PAD = 4

const scrollContainerStyles = css`
	height: 100%;
	overflow-x: hidden;
	overflow-y: auto;
	scrollbar-gutter: stable;
	width: 100%;
`

const headerStyles = css`
	align-items: center;
	color: #cfcfcf;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 18px;
	font-weight: 600;
	height: ${HEADER_HEIGHT}px;
	padding: 0 8px;
	position: absolute;
	width: 100%;

	&::after {
		border-bottom: 1px solid #555;
		bottom: 6px;
		content: '';
		left: 8px;
		position: absolute;
		right: 8px;
	}
`

const itemStyles = css`
	filter: drop-shadow(3px 3px 4px #222);
	position: absolute;
`

const propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          path: PropTypes.string.isRequired,
        }),
      ).isRequired,
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  itemPadding: PropTypes.string,
  numberOfColumns: PropTypes.number,
  renderItem: PropTypes.func.isRequired,
}

const DateGroupedGrid = ({
  groups,
  itemPadding = "0",
  numberOfColumns = 1,
  renderItem,
}) => {
  const animationFrameIdRef = useRef()
  const scrollContainerRef = useRef()

  const [scrollTop, setScrollTop] = useState(0)

  const [viewport, setViewport] = useState({
    itemSize: 1,
    viewHeight: 0,
  })

  useLayoutEffect(() => {
    const calculateViewport = () => {
      const viewWidth =
        scrollContainerRef.current.clientWidth

      setViewport({
        itemSize: Math.ceil(viewWidth / numberOfColumns),
        viewHeight: scrollContainerRef.current.clientHeight,
      })
    }

    const throttleViewportCalculation = () => {
      if (animationFrameIdRef.current) {
        return
      }

      animationFrameIdRef.current =
        window.requestAnimationFrame(() => {
          animationFrameIdRef.current = null

          calculateViewport()
        })
    }

    const resizeObserver = new ResizeObserver(
      throttleViewportCalculation,
    )

    resizeObserver.observe(scrollContainerRef.current)

    return () => {
      window.cancelAnimationFrame(
        animationFrameIdRef.current,
      )

      animationFrameIdRef.current = null

      resizeObserver.disconnect()
    }
  }, [numberOfColumns])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    const updateScrollTop = () => {
      setScrollTop(scrollContainer.scrollTop)
    }

    const throttleScrollUpdate = () => {
      if (animationFrameIdRef.current) {
        return
      }

      animationFrameIdRef.current =
        window.requestAnimationFrame(() => {
          animationFrameIdRef.current = null

          updateScrollTop()
        })
    }

    scrollContainer.addEventListener(
      "scroll",
      throttleScrollUpdate,
    )

    return () => {
      scrollContainer.removeEventListener(
        "scroll",
        throttleScrollUpdate,
      )
    }
  }, [])

  // Absolute-positioned layout for every header and item, plus the total
  // height. Recomputed only when the groups or grid geometry change.
  const { placements, totalHeight } = useMemo(() => {
    const { itemSize } = viewport

    const nextPlacements = []

    let top = 0

    groups.forEach((group) => {
      nextPlacements.push({
        height: HEADER_HEIGHT,
        key: `header:${group.key}`,
        label: group.label,
        top,
        type: "header",
      })

      top += HEADER_HEIGHT

      const groupTop = top

      group.items.forEach((item, index) => {
        const column = index % numberOfColumns
        const row = Math.floor(index / numberOfColumns)

        nextPlacements.push({
          item,
          key: item.path,
          left: column * itemSize,
          size: itemSize,
          top: groupTop + row * itemSize,
          type: "item",
        })
      })

      const rowCount = Math.ceil(
        group.items.length / numberOfColumns,
      )

      top = groupTop + rowCount * itemSize
    })

    return { placements: nextPlacements, totalHeight: top }
  }, [groups, numberOfColumns, viewport])

  const visiblePlacements = useMemo(() => {
    const { itemSize, viewHeight } = viewport

    const padding = ROWS_TO_PAD * itemSize

    const viewTop = scrollTop - padding
    const viewBottom = scrollTop + viewHeight + padding

    return placements.filter((placement) => {
      const placementBottom =
        placement.top +
        (placement.type === "header"
          ? placement.height
          : placement.size)

      return (
        placementBottom > viewTop &&
        placement.top < viewBottom
      )
    })
  }, [placements, scrollTop, viewport])

  const itemWrapperStyles = useMemo(
    () => css`
			${itemStyles}
			padding: ${itemPadding};
		`,
    [itemPadding],
  )

  return (
    <div
      css={scrollContainerStyles}
      ref={scrollContainerRef}
    >
      <div
        css={css`
					height: ${totalHeight}px;
					position: relative;
					width: 100%;
				`}
      >
        {visiblePlacements.map((placement) =>
          placement.type === "header" ? (
            <div
              css={css`
								${headerStyles}
								top: ${placement.top}px;
							`}
              key={placement.key}
            >
              {placement.label}
            </div>
          ) : (
            <div
              css={css`
								${itemWrapperStyles}
								height: ${placement.size}px;
								left: ${placement.left}px;
								top: ${placement.top}px;
								width: ${placement.size}px;
							`}
              key={placement.key}
            >
              {renderItem(placement.item)}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

DateGroupedGrid.propTypes = propTypes

const MemoizedDateGroupedGrid = memo(DateGroupedGrid)

export default MemoizedDateGroupedGrid
