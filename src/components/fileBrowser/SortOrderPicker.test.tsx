import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import SortOrderPicker from "./SortOrderPicker"

describe("SortOrderPicker", () => {
  test("shows the current order on the trigger, which carries the accessible name", () => {
    render(
      <SortOrderPicker
        onChange={vi.fn()}
        value="modifiedDesc"
      />,
    )

    // The trigger is the button the portalled listbox is named by, so the name
    // lives here rather than on any wrapper.
    const trigger = screen.getByRole("button", {
      name: "Sort order",
    })

    expect(trigger).toHaveTextContent("Newest")
  })

  test("keeps the listbox closed until the trigger opens it, then lists both orders", () => {
    render(
      <SortOrderPicker onChange={vi.fn()} value="name" />,
    )

    // Portalled: nothing is mounted until the trigger is clicked.
    expect(
      screen.queryByRole("listbox"),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "Sort order" }),
    )

    expect(screen.getByRole("listbox")).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Name" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Newest" }),
    ).toBeInTheDocument()
  })

  test("reports the chosen order's value and closes the listbox on select", () => {
    const onChange = vi.fn()

    render(
      <SortOrderPicker onChange={onChange} value="name" />,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Sort order" }),
    )
    fireEvent.click(
      screen.getByRole("option", { name: "Newest" }),
    )

    // Raw value handed back — the caller narrows it back to `SortOrder`.
    expect(onChange).toHaveBeenCalledWith("modifiedDesc")
    expect(
      screen.queryByRole("listbox"),
    ).not.toBeInTheDocument()
  })

  test("marks the current order as the selected option", () => {
    render(
      <SortOrderPicker
        onChange={vi.fn()}
        value="modifiedDesc"
      />,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Sort order" }),
    )

    expect(
      screen.getByRole("option", { name: "Newest" }),
    ).toHaveAttribute("aria-selected", "true")
    expect(
      screen.getByRole("option", { name: "Name" }),
    ).toHaveAttribute("aria-selected", "false")
  })

  test("moves the checkmark when the order changes from outside, not just the label", () => {
    // Drilling into a folder with a different stored order is exactly this: a
    // new `value` with no interaction. `Listbox` treats `selectedValue` as a
    // mount-time seed, so without `OptionPicker`'s `key` the trigger would read
    // "Name" while the panel still announced "Newest, selected".
    const { rerender } = render(
      <SortOrderPicker
        onChange={vi.fn()}
        value="modifiedDesc"
      />,
    )

    rerender(
      <SortOrderPicker onChange={vi.fn()} value="name" />,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Sort order" }),
    )

    expect(
      screen.getByRole("option", { name: "Name" }),
    ).toHaveAttribute("aria-selected", "true")
    expect(
      screen.getByRole("option", { name: "Newest" }),
    ).toHaveAttribute("aria-selected", "false")
  })
})
