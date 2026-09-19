import { render } from "@testing-library/react"
import { act, type ReactNode } from "react"
import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import VirtualizedList from "./VirtualizedList"

let triggerResize = () => {}

const renderList = (children: ReactNode) =>
  render(
    <VirtualizedList numberOfColumns={1} selectedIndex={0}>
      {children}
    </VirtualizedList>,
  )

describe("VirtualizedList pointer rerenders", () => {
  beforeEach(() => {
    HTMLDivElement.prototype.scrollTo = vi.fn()

    globalThis.ResizeObserver = class FakeResizeObserver
      implements ResizeObserver
    {
      constructor(callback: ResizeObserverCallback) {
        triggerResize = () => {
          callback([], this)
        }
      }

      observe() {
        triggerResize()
      }

      unobserve() {}
      disconnect() {}
    }
  })

  test("keeps the scroll position when rebuilt children have the same measurements", () => {
    const { container, rerender } = renderList(
      <div key="one">One</div>,
    )

    const scrollContainer = container.firstElementChild

    if (!(scrollContainer instanceof HTMLDivElement)) {
      throw new Error(
        "Missing virtualized-list scroll container",
      )
    }

    Object.defineProperties(scrollContainer, {
      clientHeight: { configurable: true, value: 300 },
      clientWidth: { configurable: true, value: 300 },
      scrollTop: {
        configurable: true,
        value: 600,
        writable: true,
      },
    })

    const scrollTo = vi.fn()

    scrollContainer.scrollTo = scrollTo

    act(() => {
      triggerResize()
    })
    scrollTo.mockClear()

    // A parent selection-state change produces fresh React nodes, but it does
    // not change the grid's size or keyboard index.
    rerender(
      <VirtualizedList
        numberOfColumns={1}
        selectedIndex={0}
      >
        <div key="one">One selected</div>
      </VirtualizedList>,
    )

    expect(scrollTo).not.toHaveBeenCalled()
    expect(scrollContainer.scrollTop).toBe(600)
  })
})
