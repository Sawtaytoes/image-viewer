import {
  CONTROL_SIZE_CLASS,
  FOCUS_RING_CLASS,
  Listbox,
} from "@charcuterie/ui"
import { useCallback, useState } from "react"

import ChevronDownIcon from "../icons/ChevronDownIcon"
import type { SortOrder } from "../settings/sortOrders"
import { sortOrderOptions } from "../settings/sortOrders"

// Non-native replacement for the styled native `<select>` the sort picker used
// to be — same two options ("Name" / "Newest"), but a `Listbox` (portalled,
// keyboard-driven, `aria-selected`) so the OS dropdown chrome is gone. Shared by
// the file browser's `DirectoryControls` and the in-pane `PaneGallery`, whose
// pickers were byte-for-byte identical, so this is the one place either look or
// behaviour changes.
//
// The trigger is sized off `CONTROL_SIZE_CLASS.sm` — the same density token the
// sibling `IconButton`s and the old native `Select size="sm"` read — rather than
// a hardcoded height, so it stays aligned with the bar as the density axis (or a
// future Charcuterie size revision) moves it.
const triggerClassName = `inline-flex w-full cursor-pointer appearance-none items-center justify-between rounded-md border border-border-default bg-surface-raised text-content-primary transition-colors duration-(--duration-fast) ease-standard hover:border-border-strong ${CONTROL_SIZE_CLASS.sm} ${FOCUS_RING_CLASS}`

// The chevron mirrors the native select's own arrow: muted, and non-interactive
// (the whole trigger is the button).
const chevronClassName = "flex-none text-content-secondary"

interface SortOrderSelectProps {
  // Raw `string` rather than `SortOrder`: the `Listbox` reports the chosen
  // option's `value` untyped, so the caller narrows it (via `isSortOrder`),
  // exactly as the native `Select`'s `onChange` did.
  onChange: (value: string) => void
  value: SortOrder
}

const SortOrderSelect = ({
  onChange,
  value,
}: SortOrderSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = sortOrderOptions.find(
    (option) => option.value === value,
  )

  // Click toggles: the trigger is the `Listbox`'s reference element, not part of
  // its portalled panel, so an outside-press dismissal never fires for it — a
  // second click has to close what the first opened.
  const toggleListbox = useCallback(() => {
    setIsOpen((isPreviouslyOpen) => !isPreviouslyOpen)
  }, [])

  const closeListbox = useCallback(() => {
    setIsOpen(false)
  }, [])

  const selectOption = useCallback(
    (nextValue: string) => {
      onChange(nextValue)
      setIsOpen(false)
    },
    [onChange],
  )

  return (
    <Listbox
      isVisible={isOpen}
      onDismiss={closeListbox}
      onSelect={selectOption}
      options={sortOrderOptions}
      selectedValue={value}
      trigger={
        // The `Listbox` names its panel by pointing `aria-labelledby` at this
        // trigger, so the accessible name lives here.
        <button
          aria-label="Sort order"
          className={triggerClassName}
          onClick={toggleListbox}
          type="button"
        >
          {selectedOption?.label}

          <span className={chevronClassName}>
            <ChevronDownIcon />
          </span>
        </button>
      }
    />
  )
}

export default SortOrderSelect
