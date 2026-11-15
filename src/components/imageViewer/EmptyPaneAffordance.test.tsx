import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import EmptyPaneAffordance from "./EmptyPaneAffordance"

describe("EmptyPaneAffordance", () => {
  test("passes the tap point for a pointer click", () => {
    const onActivate = vi.fn()

    render(<EmptyPaneAffordance onActivate={onActivate} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Tap to pick folder",
      }),
      { clientX: 40, clientY: 60, detail: 1 },
    )

    expect(onActivate).toHaveBeenCalledWith({
      x: 40,
      y: 60,
    })
  })

  test("passes no point for a keyboard click", () => {
    const onActivate = vi.fn()

    render(<EmptyPaneAffordance onActivate={onActivate} />)

    fireEvent.click(
      screen.getByRole("button", {
        name: "Tap to pick folder",
      }),
      { detail: 0 },
    )

    expect(onActivate).toHaveBeenCalledWith(undefined)
  })
})
