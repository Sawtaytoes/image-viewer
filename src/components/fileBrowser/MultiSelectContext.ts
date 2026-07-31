import { createContext } from "react"

// Lets `Directory` rows read/toggle the browser's multi-select state without
// prop-drilling through the generic `VirtualizedList`.
export interface MultiSelectContextValue {
  enterMultiSelect: () => void
  isMultiSelectMode: boolean
  // Read-only here on purpose: rows ask "am I selected?" and call
  // `toggleFolder`; only `FileBrowser` builds the next Set.
  selectedFolderPaths: ReadonlySet<string>
  toggleFolder: (folderPath: string) => void
}

const emptySelection: ReadonlySet<string> = new Set()

const MultiSelectContext =
  createContext<MultiSelectContextValue>({
    enterMultiSelect: () => {},
    isMultiSelectMode: false,
    selectedFolderPaths: emptySelection,
    toggleFolder: () => {},
  })

export default MultiSelectContext
