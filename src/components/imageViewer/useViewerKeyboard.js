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
  onDelete,
  onOpenMenu,
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
      // `onDelete` is optional; when a view doesn't pass it, `[Delete]` is a
      // no-op rather than mapped to anything destructive.
      Delete: onDelete,
      Enter: onClose,
      Escape: onClose,
      // `Q` for "queue": pop this column's folder-picker menu without needing the
      // center-tap. Optional, like `onDelete` — a no-op when a view omits it.
      KeyQ: onOpenMenu,
      ShiftLeft: goToPreviousImage,
    }

    const onKeyDown = (event) => {
      // Prevent taking screenshots in Windows with `[META][SHIFT][S]`.
      if (event.metaKey) {
        return
      }

      const handler = keyConfigurations[event.code]

      if (handler) {
        handler()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [
    goToNextImage,
    goToPreviousImage,
    isEnabled,
    onClose,
    onDelete,
    onOpenMenu,
  ])
}

export default useViewerKeyboard
