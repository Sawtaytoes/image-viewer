// The two orderings the gallery + viewer offer. `name` is the long-standing
// natural-name sort (the default); `modifiedDesc` sorts newest-first by the
// file's modified time and unlocks the Windows-style date grouping. Kept as a
// tiny standalone module so both the settings provider and the file-browser
// hooks can import the values without a circular dependency.
const sortOrders = {
  modifiedDesc: "modifiedDesc",
  name: "name",
}

// What a folder uses until the user changes it.
const defaultSortOrder = sortOrders.name

// Persisted as a JSON map of `folderPath → sortOrder` so each directory
// remembers its own choice (see SettingsProvider). Only non-default entries are
// stored, so the default (Name) is implicit and the map stays small.
const sortOrdersByFolderStorageKey =
  "imageViewer.sortOrdersByFolder"

const isSortOrder = (value) =>
  value === sortOrders.name ||
  value === sortOrders.modifiedDesc

// The order for a folder, falling back to the default when it has none stored
// (or when the path is unknown, e.g. the drive list at the root).
const getFolderSortOrder = (
  sortOrdersByFolder,
  folderPath,
) => sortOrdersByFolder?.[folderPath] ?? defaultSortOrder

export {
  defaultSortOrder,
  getFolderSortOrder,
  isSortOrder,
  sortOrders,
  sortOrdersByFolderStorageKey,
}
