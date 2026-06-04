// The two orderings the gallery + viewer offer. `name` is the long-standing
// natural-name sort (the default); `modifiedDesc` sorts newest-first by the
// file's modified time and unlocks the Windows-style date grouping. Kept as a
// tiny standalone module so both the settings provider and the file-browser
// hooks can import the values without a circular dependency.
const sortOrders = {
  modifiedDesc: "modifiedDesc",
  name: "name",
}

// Persisted so reopening the app remembers the choice (see SettingsProvider).
const sortOrderStorageKey = "imageViewer.sortOrder"

const isSortOrder = (value) =>
  value === sortOrders.name ||
  value === sortOrders.modifiedDesc

export { isSortOrder, sortOrderStorageKey, sortOrders }
