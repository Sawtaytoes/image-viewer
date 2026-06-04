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
  defaultSortOrder,
  isSortOrder,
  sortOrders,
  sortOrdersByFolderStorageKey,
} from "./sortOrders"

// Read the persisted per-folder sort orders once at mount. Guarded so a
// private-mode / blocked localStorage (or stale, malformed JSON) falls back to
// an empty map rather than throwing. Unrecognized or default-valued entries are
// dropped so the map only ever holds meaningful overrides.
const readStoredSortOrders = () => {
  try {
    const stored = window.localStorage.getItem(
      sortOrdersByFolderStorageKey,
    )

    if (!stored) {
      return {}
    }

    const parsed = JSON.parse(stored)

    if (!parsed || typeof parsed !== "object") {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, sortOrder]) =>
          isSortOrder(sortOrder) &&
          sortOrder !== defaultSortOrder,
      ),
    )
  } catch {
    return {}
  }
}

const propTypes = {
  children: PropTypes.node.isRequired,
}

const SettingsProvider = ({ children }) => {
  const [sortOrdersByFolder, setSortOrdersByFolder] =
    useState(readStoredSortOrders)

  // Persist on change so reopening the app remembers each folder's choice.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        sortOrdersByFolderStorageKey,
        JSON.stringify(sortOrdersByFolder),
      )
    } catch {
      // No persistence available — keep working with the in-memory map.
    }
  }, [sortOrdersByFolder])

  // Set a folder's order, dropping the entry when it returns to the default so
  // the map stays lean and "default to Name" stays implicit.
  const setSortOrder = useCallback(
    (folderPath, nextSortOrder) => {
      setSortOrdersByFolder((previousSortOrders) => {
        const currentSortOrder =
          previousSortOrders[folderPath] ?? defaultSortOrder

        if (currentSortOrder === nextSortOrder) {
          return previousSortOrders
        }

        const nextSortOrders = { ...previousSortOrders }

        if (nextSortOrder === defaultSortOrder) {
          delete nextSortOrders[folderPath]
        } else {
          nextSortOrders[folderPath] = nextSortOrder
        }

        return nextSortOrders
      })
    },
    [],
  )

  const toggleSortOrder = useCallback(
    (folderPath) => {
      setSortOrder(
        folderPath,
        (sortOrdersByFolder[folderPath] ??
          defaultSortOrder) === sortOrders.modifiedDesc
          ? sortOrders.name
          : sortOrders.modifiedDesc,
      )
    },
    [setSortOrder, sortOrdersByFolder],
  )

  const settingsProviderValue = useMemo(
    () => ({
      setSortOrder,
      sortOrdersByFolder,
      toggleSortOrder,
    }),
    [setSortOrder, sortOrdersByFolder, toggleSortOrder],
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
