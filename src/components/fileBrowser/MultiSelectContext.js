import { createContext } from "react"

// Lets `Directory` rows read/toggle the browser's multi-select state without
// prop-drilling through the generic `VirtualizedList`.
const MultiSelectContext = createContext()

export default MultiSelectContext
