import type { ReactNode } from "react"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import type { SettingsContextValue } from "./SettingsContext"
import SettingsContext from "./SettingsContext"
import type {
  SortOrder,
  SortOrdersByFolder,
} from "./sortOrders"
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
//
// Built with a loop rather than `Object.fromEntries(entries.filter(…))`: the
// filter narrows nothing, so the result would be a `Record<string, string>` and
// the only way to hand it back as a `SortOrdersByFolder` would be the cast this
// repo does not use. `isSortOrder` is a type predicate, so assigning inside the
// guard needs nothing further.
const readStoredSortOrders = (): SortOrdersByFolder => {
  const storedSortOrders: SortOrdersByFolder = {}

  try {
    const stored = window.localStorage.getItem(
      sortOrdersByFolderStorageKey,
    )

    if (!stored) {
      return storedSortOrders
    }

    const parsed: Record<string, string> =
      JSON.parse(stored)

    if (!parsed || typeof parsed !== "object") {
      return storedSortOrders
    }

    // The annotation above describes what a *well-formed* payload holds; this
    // is a file on disk the user could have edited, so each value is re-checked
    // at runtime before it is trusted.
    for (const [folderPath, sortOrder] of Object.entries(
      parsed,
    )) {
      if (
        typeof sortOrder === "string" &&
        isSortOrder(sortOrder) &&
        sortOrder !== defaultSortOrder
      ) {
        storedSortOrders[folderPath] = sortOrder
      }
    }

    return storedSortOrders
  } catch {
    return {}
  }
}

interface SettingsProviderProps {
  children: ReactNode
}

const SettingsProvider = ({
  children,
}: SettingsProviderProps) => {
  const [sortOrdersByFolder, setSortOrdersByFolder] =
    useState<SortOrdersByFolder>(readStoredSortOrders)

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
    (folderPath: string, nextSortOrder: SortOrder) => {
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
    (folderPath: string) => {
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

  const settingsProviderValue =
    useMemo<SettingsContextValue>(
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

const MemoizedSettingsProvider = memo(SettingsProvider)

export default MemoizedSettingsProvider
