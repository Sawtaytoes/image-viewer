import { createContext } from "react"

import { sortOrders } from "./sortOrders"

// App-wide view settings. Defaults keep the long-standing behavior (natural
// name sort) until the user toggles it; SettingsProvider hydrates the real
// value from localStorage.
const SettingsContext = createContext({
  setSortOrder: () => {},
  sortOrder: sortOrders.name,
  toggleSortOrder: () => {},
})

export default SettingsContext
