import { sortOrders } from "../settings/sortOrders"
import compareNaturalStrings from "./compareNaturalStrings"

// The two orderings, derived from the `sortOrders` value map rather than
// re-declared here, so the settings module stays the single source of truth.
export type SortOrder =
  (typeof sortOrders)[keyof typeof sortOrders]

// The least an entry has to carry to be sortable: a name to compare naturally
// and (optionally) an mtime. Both directories and image files satisfy it, which
// is why the combined date-grouped list goes through the same comparator.
export interface SortableEntry {
  modifiedTime?: number
  name: string
}

// Newest first; ties (or missing mtimes) fall back to the natural-name order so
// the result is still stable and readable.
const compareByModifiedDesc = (
  firstEntry: SortableEntry,
  secondEntry: SortableEntry,
): number => {
  if (
    secondEntry.modifiedTime !== firstEntry.modifiedTime
  ) {
    return (
      (secondEntry.modifiedTime ?? 0) -
      (firstEntry.modifiedTime ?? 0)
    )
  }

  return compareNaturalStrings(
    firstEntry.name,
    secondEntry.name,
  )
}

const compareByName = (
  firstEntry: SortableEntry,
  secondEntry: SortableEntry,
): number =>
  compareNaturalStrings(firstEntry.name, secondEntry.name)

// Returns a new, sorted array (never mutates the input) for the given order.
// Generic over the entry so a caller gets its own richer shape back — the
// date-grouped view sorts entries carrying a `kind` discriminant and needs it
// to survive the round trip.
const sortDirectoryEntries = <
  EntryType extends SortableEntry,
>(
  entries: readonly EntryType[],
  sortOrder: SortOrder,
): EntryType[] =>
  entries
    .slice()
    .sort(
      sortOrder === sortOrders.modifiedDesc
        ? compareByModifiedDesc
        : compareByName,
    )

export default sortDirectoryEntries
