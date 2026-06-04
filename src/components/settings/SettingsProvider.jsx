import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import SettingsContext from "./SettingsContext"
import {
  isSortOrder,
  sortOrderStorageKey,
  sortOrders,
} from "./sortOrders"

// Read the persisted sort order once at mount. Guarded so a private-mode /
// blocked localStorage (or a stale, unrecognized value) falls back to the
// default rather than throwing.
const readStoredSortOrder = () => {
  try {
    const stored = window.localStorage.getItem(
      sortOrderStorageKey,
    )

    return isSortOrder(stored) ? stored : sortOrders.name
  } catch {
    return sortOrders.name
  }
}

const propTypes = {
  children: PropTypes.node.isRequired,
}

const SettingsProvider = ({ children }) => {
  const [sortOrder, setSortOrder] = useState(
    readStoredSortOrder,
  )

  // Persist on change so reopening the app remembers the choice.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        sortOrderStorageKey,
        sortOrder,
      )
    } catch {
      // No persistence available — keep working with the in-memory value.
    }
  }, [sortOrder])

  const toggleSortOrder = useCallback(() => {
    setSortOrder((previousSortOrder) =>
      previousSortOrder === sortOrders.modifiedDesc
        ? sortOrders.name
        : sortOrders.modifiedDesc,
    )
  }, [])

  const settingsProviderValue = useMemo(
    () => ({
      setSortOrder,
      sortOrder,
      toggleSortOrder,
    }),
    [sortOrder, toggleSortOrder],
  )

  return (
    <SettingsContext.Provider value={settingsProviderValue}>
      {children}
    </SettingsContext.Provider>
  )
}

SettingsProvider.propTypes = propTypes

const MemoizedSettingsProvider = memo(SettingsProvider)

export default MemoizedSettingsProvider
