import PropTypes from "prop-types"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import FullScreenContext from "./FullScreenContext"

const fullScreenApi = window.api.fullScreen

// Tracks this window's OS fullscreen state. Main owns the truth — F11 and the
// title-bar button both flip it there — so we hydrate once, then follow the
// enter/leave events rather than assuming the button is the only trigger.
const FullScreenProvider = ({ children }) => {
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    let isActive = true

    fullScreenApi.get().then((value) => {
      if (isActive) {
        setIsFullScreen(value)
      }
    })

    const unsubscribe =
      fullScreenApi.onChanged(setIsFullScreen)

    return () => {
      isActive = false

      unsubscribe()
    }
  }, [])

  const toggleFullScreen = useCallback(() => {
    fullScreenApi.toggle().then(setIsFullScreen)
  }, [])

  const value = useMemo(
    () => ({ isFullScreen, toggleFullScreen }),
    [isFullScreen, toggleFullScreen],
  )

  return (
    <FullScreenContext.Provider value={value}>
      {children}
    </FullScreenContext.Provider>
  )
}

FullScreenProvider.propTypes = {
  children: PropTypes.node,
}

export default FullScreenProvider
