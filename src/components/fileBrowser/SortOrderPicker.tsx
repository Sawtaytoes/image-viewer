import type { SortOrder } from "../settings/sortOrders"
import { sortOrderOptions } from "../settings/sortOrders"
import OptionPicker from "../toolkit/OptionPicker"

// The sort picker's two options ("Name" / "Newest") bound to the app's one
// picker component. Shared by the file browser's `DirectoryControls` and the
// in-pane `PaneGallery`, whose pickers were byte-for-byte identical, so this is
// the one place either the label or the option list changes; how a picker
// *looks* is `OptionPicker`'s job, and the library's below that.
interface SortOrderPickerProps {
  // Raw `string` rather than `SortOrder`: the `Listbox` reports the chosen
  // option's `value` untyped, so the caller narrows it (via `isSortOrder`).
  onChange: (value: string) => void
  value: SortOrder
}

const SortOrderPicker = ({
  onChange,
  value,
}: SortOrderPickerProps) => (
  <OptionPicker
    label="Sort order"
    onChange={onChange}
    options={sortOrderOptions}
    value={value}
  />
)

export default SortOrderPicker
