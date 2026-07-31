import {
  Children,
  memo,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

// Every one of these is a measured, runtime number — item size, column count,
// scroll offset — so the per-item box goes in an inline `style`. A Tailwind
// class built from a template literal generates no CSS at all (Tailwind scans
// source text), which in a virtualized list means every tile silently collapses
// to zero width.
const itemClassName =
  "absolute drop-shadow-[3px_3px_4px_var(--color-surface-sunken)]"

const selectedItemClassName = `${itemClassName} border-4 border-dotted border-border-strong`

interface ViewData {
  itemSize: number
  numberOfChildren: number
  numberOfItemsInView: number
}

const initialViewData: ViewData = {
  itemSize: 1,
  numberOfChildren: 0,
  numberOfItemsInView: 0,
}

interface VirtualizedListProps {
  children: ReactNode
  itemPadding?: string
  numberOfColumns?: number
  selectedIndex?: number
}

const VirtualizedList = ({
  children,
  itemPadding = "0",
  numberOfColumns = 1,
  selectedIndex = 0,
}: VirtualizedListProps) => {
  const animationFrameIdRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const virtualizedListRef = useRef<HTMLDivElement>(null)

  const [scrollYPosition, setScrollYPosition] = useState(0)

  const [viewData, setViewData] =
    useState<ViewData>(initialViewData)

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current
    const virtualizedList = virtualizedListRef.current

    if (!scrollContainer || !virtualizedList) {
      return undefined
    }

    const calculateViewData = () => {
      const viewWidth = scrollContainer.clientWidth

      const viewHeight = scrollContainer.clientHeight

      const itemSize = Math.ceil(
        viewWidth / numberOfColumns,
      )

      const numberOfItemsInView =
        Math.ceil(
          viewHeight / (viewWidth / numberOfColumns),
        ) * numberOfColumns

      const numberOfChildren = Children.count(children)

      const numberOfRows = Math.ceil(
        Children.count(children) / numberOfColumns,
      )

      const containerHeight = itemSize * numberOfRows

      virtualizedList.style.setProperty(
        "height",
        `${containerHeight}px`,
      )

      setViewData({
        itemSize,
        numberOfChildren,
        numberOfItemsInView,
      })
    }

    const throttleViewDataCalculation = () => {
      if (animationFrameIdRef.current) {
        return
      }

      animationFrameIdRef.current =
        window.requestAnimationFrame(() => {
          animationFrameIdRef.current = null

          calculateViewData()
        })
    }

    const resizeObserver = new ResizeObserver(
      throttleViewDataCalculation,
    )

    resizeObserver.observe(scrollContainer)

    return () => {
      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameIdRef.current,
        )
      }

      animationFrameIdRef.current = null

      resizeObserver.disconnect()
    }
  }, [children, numberOfColumns])

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return
    }

    const { itemSize, numberOfChildren } = viewData

    const clampedIndex = Math.min(
      numberOfChildren - 1,
      Math.max(0, selectedIndex),
    )

    const itemTopPosition =
      Math.floor(clampedIndex / numberOfColumns) * itemSize

    const itemBottomPosition = itemTopPosition + itemSize

    const viewTop = scrollContainer.scrollTop

    const viewHeight = scrollContainer.clientHeight

    const viewBottom = viewTop + viewHeight

    if (itemTopPosition < viewTop) {
      scrollContainer.scrollTo(0, itemTopPosition)
    }

    if (itemBottomPosition > viewBottom) {
      scrollContainer.scrollTo(
        0,
        viewTop + (itemBottomPosition - viewBottom),
      )
    }
  }, [numberOfColumns, selectedIndex, viewData])

  useEffect(() => {
    // Capture the node now: on unmount React has already nulled the ref by the
    // time this cleanup runs, so reading `scrollContainerRef.current` there
    // would throw (it does when toggling sort swaps this list out).
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return undefined
    }

    const updateScrollPosition = () => {
      setScrollYPosition(scrollContainer.scrollTop)
    }

    const throttleScrollPositionUpdate = () => {
      if (animationFrameIdRef.current) {
        return
      }

      animationFrameIdRef.current =
        window.requestAnimationFrame(() => {
          animationFrameIdRef.current = null

          updateScrollPosition()
        })
    }

    scrollContainer.addEventListener(
      "scroll",
      throttleScrollPositionUpdate,
    )

    return () => {
      scrollContainer.removeEventListener(
        "scroll",
        throttleScrollPositionUpdate,
      )
    }
  }, [])

  const virtualizedChildren = useMemo(() => {
    const {
      itemSize,
      numberOfChildren,
      numberOfItemsInView,
    } = viewData

    const numberOfRowsToPad = 8

    const numberOfItemsToPad =
      numberOfRowsToPad * numberOfColumns

    const numberOfItemsToRender =
      numberOfItemsInView + numberOfItemsToPad

    const startingOffset =
      Math.floor(scrollYPosition / itemSize) *
        numberOfColumns -
      numberOfItemsToPad / 2

    const endingOffset =
      startingOffset + numberOfItemsToRender

    const isStartingOffsetOutOfBounds = startingOffset < 0

    const isEndingOffsetOutOfBounds =
      endingOffset > numberOfChildren

    const startingIndex = isEndingOffsetOutOfBounds
      ? Math.max(
          0,
          numberOfChildren - numberOfItemsToRender,
        )
      : isStartingOffsetOutOfBounds
        ? 0
        : startingOffset

    const endingIndex = isStartingOffsetOutOfBounds
      ? numberOfItemsToRender
      : isEndingOffsetOutOfBounds
        ? numberOfChildren
        : endingOffset

    return Children.toArray(children)
      .slice(startingIndex, endingIndex)
      .map((childElement, index) => {
        const shiftedIndex = index + startingIndex

        return (
          <div
            className={
              shiftedIndex === selectedIndex
                ? selectedItemClassName
                : itemClassName
            }
            key={shiftedIndex}
            style={{
              left: `${(shiftedIndex % numberOfColumns) * itemSize}px`,
              padding: itemPadding,
              top: `${Math.floor(shiftedIndex / numberOfColumns) * itemSize}px`,
              width: `calc((1 / ${numberOfColumns}) * 100%)`,
            }}
          >
            {childElement}
          </div>
        )
      })
  }, [
    children,
    itemPadding,
    numberOfColumns,
    scrollYPosition,
    selectedIndex,
    viewData,
  ])

  return (
    <div
      className="h-full w-full overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
      ref={scrollContainerRef}
    >
      <div
        className="relative h-auto w-full"
        ref={virtualizedListRef}
      >
        {virtualizedChildren}
      </div>
    </div>
  )
}

const MemoizedVirtualizedList = memo(VirtualizedList)

export default MemoizedVirtualizedList
