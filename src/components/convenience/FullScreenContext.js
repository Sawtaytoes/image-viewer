import { createContext } from "react"

// This window's OS fullscreen state and a toggle for it. The defaults keep any
// component that reads it outside the provider (e.g. in tests) on the normal,
// windowed layout.
const FullScreenContext = createContext({
  isFullScreen: false,
  toggleFullScreen: () => {},
})

export default FullScreenContext
