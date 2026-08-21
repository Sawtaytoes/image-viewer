import type { ControlSize } from "@charcuterie/tokens"
import {
  Button,
  Listbox,
  type ListboxItem,
} from "@charcuterie/ui"
import type { ComponentPropsWithoutRef } from "react"
import { useCallback, useState } from "react"

import ChevronDownIcon from "../icons/ChevronDownIcon"

// `onChange`/`value` are the picker's own, not the `<button>`'s: the DOM ones
// are a `FormEvent` handler and the button's `value` attribute, and leaving
// them in would let a caller pass either by mistake and get no type error.
interface OptionPickerProps
  extends Omit<
    ComponentPropsWithoutRef<"button">,
    "onChange" | "value"
  > {
  isDisabled?: boolean
  /**
   * The accessible name. The `Listbox` names its portalled panel by pointing
   * `aria-labelledby` at this trigger, so a picker with no label leaves the
   * panel unnamed — and `getByRole("button", { name })` finds nothing.
   */
  label?: string
  onChange: (value: string) => void
  options: readonly ListboxItem[]
  /** Shown when `value` matches no option — a picker with nothing chosen yet. */
  placeholder?: string
  size?: ControlSize
  /**
   * Optional for a fire-and-reset action picker, which stores no value and
   * uses `placeholder` as its resting label. A picker that holds a choice
   * passes it.
   */
  value?: string
}

/**
 * This app's one picker: a `Listbox` plus the button that opens it.
 *
 * **Every picker here is a `Listbox`, never a native `Select`** — the native
 * control paints as the OS widget, which looks wrong on Windows and cannot be
 * restyled. See the fleet decision (`agentic`,
 * `docs/decisions/2026-08-20-listbox-is-the-picker-in-every-owned-app-and-native-select-is-a-hatch-we-have-never-needed.md`)
 * and the library's own (`charcuterie`,
 * `docs/decisions/2026-08-10-listbox-and-combobox-are-the-default-and-select-is-demoted.md`).
 * Rich options are what `<option>` *cannot* render, not the dividing line: a
 * plain list of strings gets a `Listbox` too.
 *
 * The wrapper exists because `Listbox` is a low-level pairing — it wants a
 * `trigger` element and caller-owned `isVisible`/`onDismiss` — and every call
 * site hand-rolling the same `useState` is another chance to get the
 * open/close wiring subtly different. Here a picker is one element with
 * `options`, `value` and `onChange`.
 *
 * The remaining button props are passed through to the trigger, and that is
 * load-bearing: `Field` clones `id`, `aria-describedby`, `aria-invalid` and
 * `required` onto whatever control it is given, so a closed prop list would
 * silently drop all four and the label would point at nothing.
 */
const OptionPicker = ({
  className,
  isDisabled,
  label,
  onChange,
  options,
  placeholder = "Select…",
  size = "sm",
  value,
  ...triggerProps
}: OptionPickerProps) => {
  const [isVisible, setIsVisible] = useState(false)

  const selectedOption = options.find(
    (option) => option.value === value,
  )

  // Click toggles: the trigger is the `Listbox`'s reference element, not part
  // of its portalled panel, so an outside-press dismissal never fires for it —
  // a second click has to close what the first opened.
  const toggleListbox = useCallback(() => {
    setIsVisible(
      (isPreviouslyVisible) => !isPreviouslyVisible,
    )
  }, [])

  const closeListbox = useCallback(() => {
    setIsVisible(false)
  }, [])

  return (
    <Listbox
      // `selectedValue` is a **seed**, not a controlled prop: `useSinglePicker`
      // captures it in a `useState` initialiser, so a later change never
      // reaches the panel. Keying on the committed value remounts the listbox
      // when the value moves from outside — which is exactly what drilling into
      // a folder with a different stored sort order does. Without this the
      // trigger reads "Name" while the checkmark still sits on "Newest", and a
      // screen reader announces the stale one.
      key={value ?? ""}
      isVisible={isVisible}
      // Choosing also lands here: `Listbox` dismisses itself on select, the way
      // the native control it stands in for does.
      onDismiss={closeListbox}
      onSelect={onChange}
      options={options}
      selectedValue={value}
      trigger={
        <Button
          aria-label={label}
          {...triggerProps}
          // `outline`, not the default solid: this stands where a `<select>`
          // would, so it wears a border and the page surface. Solid neutral
          // reads as a filled button — obvious in light mode, where the trigger
          // comes out a dark slab in a pale toolbar.
          appearance="outline"
          className={`justify-between font-normal${className ? ` ${className}` : ""}`}
          iconEnd={<ChevronDownIcon />}
          intent="neutral"
          isDisabled={isDisabled}
          isFullWidth
          onClick={toggleListbox}
          size={size}
        >
          {selectedOption?.label ?? placeholder}
        </Button>
      }
    />
  )
}

export default OptionPicker
