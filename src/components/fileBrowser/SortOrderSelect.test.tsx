import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SortOrderSelect from "./SortOrderSelect"

describe("SortOrderSelect", () => {
  it("shows the current order on the trigger, which carries the accessible name", () => {
    render(
      <SortOrderSelect
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

  it("keeps the listbox closed until the trigger opens it, then lists both orders", () => {
    render(
      <SortOrderSelect onChange={vi.fn()} value="name" />,
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

  it("reports the chosen order's value and closes the listbox on select", () => {
    const onChange = vi.fn()

    render(
      <SortOrderSelect onChange={onChange} value="name" />,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Sort order" }),
    )
    fireEvent.click(
      screen.getByRole("option", { name: "Newest" }),
    )

    // Raw value handed back, exactly as the native `Select` did — the caller
    // narrows it back to `SortOrder`.
    expect(onChange).toHaveBeenCalledWith("modifiedDesc")
    expect(
      screen.queryByRole("listbox"),
    ).not.toBeInTheDocument()
  })

  it("marks the current order as the selected option", () => {
    render(
      <SortOrderSelect
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
})
