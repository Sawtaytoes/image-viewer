import { sortOrders } from "../settings/sortOrders"
import compareNaturalStrings from "./compareNaturalStrings"

// Newest first; ties (or missing mtimes) fall back to the natural-name order so
// the result is still stable and readable.
const compareByModifiedDesc = (firstEntry, secondEntry) => {
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

const compareByName = (firstEntry, secondEntry) =>
  compareNaturalStrings(firstEntry.name, secondEntry.name)

// Returns a new, sorted array (never mutates the input) for the given order.
const sortDirectoryEntries = (entries, sortOrder) =>
  entries
    .slice()
    .sort(
      sortOrder === sortOrders.modifiedDesc
        ? compareByModifiedDesc
        : compareByName,
    )

export default sortDirectoryEntries
