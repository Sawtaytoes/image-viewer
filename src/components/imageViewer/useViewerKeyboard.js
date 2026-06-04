import { useEffect } from "react"

// Arrow/close keyboard handling for the viewer, acting on whichever view is
// active (the legacy single image, or the active pane). Extracted from the old
// always-on `ImageViewControls` header so keyboard nav survives that header
// becoming swipe-summoned chrome. Keyboard is secondary to touch but must not
// regress.
const useViewerKeyboard = ({
  goToNextImage,
  goToPreviousImage,
  isEnabled,
  onClose,
}) => {
  useEffect(() => {
    if (!isEnabled) {
      return undefined
    }

    const keyConfigurations = {
      ArrowLeft: goToPreviousImage,
      ArrowRight: goToNextImage,
      Backspace: onClose,
      ControlLeft: goToNextImage,
      Enter: onClose,
      Escape: onClose,
      ShiftLeft: goToPreviousImage,
    }

    const onKeyDown = (event) => {
      // Prevent taking screenshots in Windows with `[META][SHIFT][S]`.
      if (event.metaKey) {
        return
      }

      if (keyConfigurations[event.code]) {
        keyConfigurations[event.code]()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [goToNextImage, goToPreviousImage, isEnabled, onClose])
}

export default useViewerKeyboard
