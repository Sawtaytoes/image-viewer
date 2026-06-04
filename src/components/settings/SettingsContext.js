import { createContext } from "react"

// App-wide view settings. The sort order is stored per folder path (defaulting
// to the natural-name sort); SettingsProvider hydrates the map from
// localStorage. Consumers read their folder's order with `getFolderSortOrder`
// from ./sortOrders.
const SettingsContext = createContext({
  setSortOrder: () => {},
  sortOrdersByFolder: {},
  toggleSortOrder: () => {},
})

export default SettingsContext
