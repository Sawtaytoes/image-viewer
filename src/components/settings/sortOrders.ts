// The two orderings the gallery + viewer offer. `name` is the long-standing
// natural-name sort (the default); `modifiedDesc` sorts newest-first by the
// file's modified time and unlocks the Windows-style date grouping. Kept as a
// tiny standalone module so both the settings provider and the file-browser
// hooks can import the values without a circular dependency.
export type SortOrder = "modifiedDesc" | "name"

// `folderPath → sortOrder`, holding ONLY the folders that differ from the
// default — see `sortOrdersByFolderStorageKey` below. A missing key therefore
// means "default", not "unknown folder", which is why every read goes through
// `getFolderSortOrder`.
export type SortOrdersByFolder = Record<string, SortOrder>

// A mapped type rather than a plain object annotation, so each property keeps
// its own literal type: `sortOrders.name` is `"name"`, not the whole union.
// Call sites like the sort-toggle label map depend on that.
const sortOrders: { readonly [Order in SortOrder]: Order } =
  {
    modifiedDesc: "modifiedDesc",
    name: "name",
  }

// What a folder uses until the user changes it. Per-folder persistence and the
// separate image/folder defaults are a locked decision
// (`docs/decisions/2026-06-04-sort-persists-per-folder-images-and-folders-separate.md`).
const defaultSortOrder: SortOrder = sortOrders.name

// Persisted as a JSON map of `folderPath → sortOrder` so each directory
// remembers its own choice (see SettingsProvider). Only non-default entries are
// stored, so the default (Name) is implicit and the map stays small.
const sortOrdersByFolderStorageKey =
  "imageViewer.sortOrdersByFolder"

// A type predicate, so narrowing a value read back out of localStorage is the
// guard itself rather than a cast at the call site.
const isSortOrder = (value: string): value is SortOrder =>
  value === sortOrders.name ||
  value === sortOrders.modifiedDesc

// The order for a folder, falling back to the default when it has none stored
// (or when the path is unknown, e.g. the drive list at the root, where callers
// have no folder path at all).
const getFolderSortOrder = (
  sortOrdersByFolder: SortOrdersByFolder,
  folderPath: string | null,
): SortOrder =>
  (folderPath == null
    ? undefined
    : sortOrdersByFolder[folderPath]) ?? defaultSortOrder

export {
  defaultSortOrder,
  getFolderSortOrder,
  isSortOrder,
  sortOrders,
  sortOrdersByFolderStorageKey,
}
