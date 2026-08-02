import {
  memo,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type { ImageFile } from "../../types"
import type { DateGroup } from "./dateGroups"

// Windowed grid that lays each date group out as a full-width header followed
// by its items in an N-column grid. Unlike `VirtualizedList` (a single uniform
// grid indexed by position), rows here are mixed-height — header rows and item
// rows — so it carries its own absolute-position layout. Only placements inside
// the viewport (plus a small pad) render, so large folders stay light even
// though every folder tile fetches its own preview listing.

const HEADER_HEIGHT = 40

const ROWS_TO_PAD = 4

// A folder and an image share the tile shape; `kind` is what tells the caller's
// `renderItem` which of the two tiles to build. Declared here because this is
// the component that traffics in them, and `FileBrowser` builds them for it.
export interface DateGroupedEntry extends ImageFile {
  kind: "directory" | "image"
}

interface HeaderPlacement {
  height: number
  key: string
  label: string
  top: number
  type: "header"
}

interface ItemPlacement {
  item: DateGroupedEntry
  key: string
  left: number
  size: number
  top: number
  type: "item"
}

type Placement = HeaderPlacement | ItemPlacement

interface Viewport {
  itemSize: number
  viewHeight: number
}

const initialViewport: Viewport = {
  itemSize: 1,
  viewHeight: 0,
}

// Every box in this grid is sized from a measured viewport, so all of it lives
// in inline `style` — a `top-[${n}px]` class compiles and generates no CSS,
// which here would stack every tile at the origin.
const itemClassName =
  "absolute drop-shadow-[3px_3px_4px_var(--color-surface-sunken)]"

const headerClassName =
  "absolute flex w-full items-center px-2 text-lg font-semibold text-content-secondary after:absolute after:right-2 after:bottom-1.5 after:left-2 after:border-b after:border-border-default after:content-['']"

interface DateGroupedGridProps {
  groups: DateGroup<DateGroupedEntry>[]
  itemPadding?: string
  numberOfColumns?: number
  renderItem: (item: DateGroupedEntry) => ReactNode
}

const DateGroupedGrid = ({
  groups,
  itemPadding = "0",
  numberOfColumns = 1,
  renderItem,
}: DateGroupedGridProps) => {
  const animationFrameIdRef = useRef<number | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [scrollTop, setScrollTop] = useState(0)

  const [viewport, setViewport] =
    useState<Viewport>(initialViewport)

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return undefined
    }

    const calculateViewport = () => {
      const viewWidth = scrollContainer.clientWidth

      setViewport({
        itemSize: Math.ceil(viewWidth / numberOfColumns),
        viewHeight: scrollContainer.clientHeight,
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
  }, [numberOfColumns])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return undefined
    }

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

    const nextPlacements: Placement[] = []

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

  return (
    <div
      className="h-full w-full overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
      ref={scrollContainerRef}
    >
      <div
        className="relative w-full"
        style={{ height: `${totalHeight}px` }}
      >
        {visiblePlacements.map((placement) =>
          placement.type === "header" ? (
            <div
              className={headerClassName}
              key={placement.key}
              style={{
                height: `${placement.height}px`,
                top: `${placement.top}px`,
              }}
            >
              {placement.label}
            </div>
          ) : (
            <div
              className={itemClassName}
              key={placement.key}
              style={{
                height: `${placement.size}px`,
                left: `${placement.left}px`,
                padding: itemPadding,
                top: `${placement.top}px`,
                width: `${placement.size}px`,
              }}
            >
              {renderItem(placement.item)}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

const MemoizedDateGroupedGrid = memo(DateGroupedGrid)

export default MemoizedDateGroupedGrid
