import { createContext } from "react"

// This window's OS fullscreen state and a toggle for it.
export interface FullScreenContextValue {
  isFullScreen: boolean
  toggleFullScreen: () => void
}

// The defaults keep any component that reads it outside the provider (e.g. in
// tests) on the normal, windowed layout. Because a real default exists, the
// value type has no `undefined` arm and no consumer needs a null check.
const FullScreenContext =
  createContext<FullScreenContextValue>({
    isFullScreen: false,
    toggleFullScreen: () => {},
  })

export default FullScreenContext
