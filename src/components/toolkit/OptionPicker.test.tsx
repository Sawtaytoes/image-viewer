import { Field } from "@charcuterie/ui"
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import OptionPicker from "./OptionPicker"

const options = [
  { label: "Name", value: "name" },
  { label: "Newest", value: "modifiedDesc" },
]

describe("OptionPicker", () => {
  test("falls back to the placeholder when no value is stored", () => {
    // The fire-and-reset shape: no `value` at all, so the placeholder is the
    // resting label and every pick is a real change.
    render(
      <OptionPicker
        label="Move to…"
        onChange={vi.fn()}
        options={options}
        placeholder="Move to…"
      />,
    )

    expect(
      screen.getByRole("button", { name: "Move to…" }),
    ).toHaveTextContent("Move to…")
  })

  test("a second click on the trigger closes what the first opened", () => {
    // The trigger is the listbox's reference element rather than part of its
    // portalled panel, so floating-ui's outside-press dismissal never fires for
    // it — the toggle is ours to get right.
    render(
      <OptionPicker
        label="Sort order"
        onChange={vi.fn()}
        options={options}
        value="name"
      />,
    )

    const trigger = screen.getByRole("button", {
      name: "Sort order",
    })

    fireEvent.click(trigger)
    expect(screen.getByRole("listbox")).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(
      screen.queryByRole("listbox"),
    ).not.toBeInTheDocument()
  })

  test("passes a Field's cloned wiring through to the trigger", () => {
    // `Field` clones `id`, `aria-describedby`, `aria-invalid` and `required`
    // onto its single child. A closed prop list drops all four silently — the
    // label would point at an id on nothing — so the rest prop spread is a
    // behaviour, not tidiness.
    render(
      <Field
        description="Applies to this folder only"
        error="Pick an order"
        isRequired
        label="Sort order"
      >
        {/* `label` is still passed inside a `Field`: a `<label for>` names a
            labelable element, and a `<button>` is not one, so without it the
            trigger's accessible name would be whichever value it happens to
            show. */}
        <OptionPicker
          label="Sort order"
          onChange={vi.fn()}
          options={options}
          value="name"
        />
      </Field>,
    )

    const trigger = screen.getByRole("button", {
      name: "Sort order",
    })

    expect(trigger).toHaveAttribute("id")
    expect(trigger).toHaveAttribute("aria-describedby")
    expect(trigger).toHaveAttribute("aria-invalid", "true")

    // The description and the error are both named by that list, in that order.
    const describedBy = (
      trigger.getAttribute("aria-describedby") ?? ""
    ).split(" ")

    expect(
      describedBy.map(
        (id) => document.getElementById(id)?.textContent,
      ),
    ).toEqual([
      "Applies to this folder only",
      "Pick an order",
    ])
  })

  test("reports the chosen option's value", () => {
    const onChange = vi.fn()

    render(
      <OptionPicker
        label="Sort order"
        onChange={onChange}
        options={options}
        value="name"
      />,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Sort order" }),
    )
    fireEvent.click(
      screen.getByRole("option", { name: "Newest" }),
    )

    expect(onChange).toHaveBeenCalledWith("modifiedDesc")
  })
})
