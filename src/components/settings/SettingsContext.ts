import { createContext } from "react"

import type {
  SortOrder,
  SortOrdersByFolder,
} from "./sortOrders"

// App-wide view settings. The sort order is stored per folder path (defaulting
// to the natural-name sort); SettingsProvider hydrates the map from
// localStorage. Consumers read their folder's order with `getFolderSortOrder`
// from ./sortOrders — never by indexing `sortOrdersByFolder` directly, because
// a missing key means "the default", not "no such folder".
export interface SettingsContextValue {
  // Set a folder's order outright. Passing the default removes the entry.
  setSortOrder: (
    folderPath: string,
    sortOrder: SortOrder,
  ) => void
  sortOrdersByFolder: SortOrdersByFolder
  // Flip one folder between the two orders — what the gallery's sort button
  // calls.
  toggleSortOrder: (folderPath: string) => void
}

// Real no-op defaults, so a component rendered outside the provider (a test, a
// storybook-style harness) reads the natural-name sort rather than crashing on
// an undefined context.
const SettingsContext = createContext<SettingsContextValue>(
  {
    setSortOrder: () => {},
    sortOrdersByFolder: {},
    toggleSortOrder: () => {},
  },
)

export default SettingsContext
