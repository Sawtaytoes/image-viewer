import { useEffect } from "react"

export interface UseViewerKeyboardOptions {
  goToNextImage: () => void
  goToPreviousImage: () => void
  isEnabled: boolean
  // When true, the first Escape peels off OS fullscreen and leaves the columns
  // alone. Matches the menu/gallery layering: dismiss the outermost chrome
  // before closing the viewer. See
  // docs/decisions/2026-08-08-escape-exits-fullscreen-before-closing-viewer.md.
  isFullScreen?: boolean
  onClose: () => void
  onDelete?: () => void
  // Required whenever `isFullScreen` can be true; Escape calls this instead of
  // `onClose` so multi-column layouts survive an accidental Esc in fullscreen.
  onExitFullScreen?: () => void
  onOpenMenu?: () => void
}

// Arrow/close keyboard handling for the viewer, acting on whichever view is
// active (the legacy single image, or the active pane). Extracted from the old
// always-on `ImageViewControls` header so keyboard nav survives that header
// becoming swipe-summoned chrome. Keyboard is secondary to touch but must not
// regress.
const useViewerKeyboard = ({
  goToNextImage,
  goToPreviousImage,
  isEnabled,
  isFullScreen = false,
  onClose,
  onDelete,
  onExitFullScreen,
  onOpenMenu,
}: UseViewerKeyboardOptions) => {
  useEffect(() => {
    if (!isEnabled) {
      return undefined
    }

    // Escape peels one layer at a time. Fullscreen sits above "leave viewer"
    // (menu/gallery own their own Esc while open and disable this hook). Enter
    // and Backspace still leave the viewer even in fullscreen — only Escape is
    // the layered dismiss key.
    const onEscape = () => {
      if (isFullScreen && onExitFullScreen) {
        onExitFullScreen()
        return
      }

      onClose()
    }

    // `KeyboardEvent.code` values, so a key a view doesn't handle is simply
    // absent (and reads back `undefined`).
    const keyConfigurations: Record<
      string,
      (() => void) | undefined
    > = {
      ArrowLeft: goToPreviousImage,
      ArrowRight: goToNextImage,
      Backspace: onClose,
      ControlLeft: goToNextImage,
      // `onDelete` is optional; when a view doesn't pass it, `[Delete]` is a
      // no-op rather than mapped to anything destructive.
      Delete: onDelete,
      Enter: onClose,
      Escape: onEscape,
      // `Q` for "queue": pop this column's folder-picker menu without needing the
      // center-tap. Optional, like `onDelete` — a no-op when a view omits it.
      KeyQ: onOpenMenu,
      ShiftLeft: goToPreviousImage,
    }

    const onKeyDown = (event: KeyboardEvent) => {
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
    isFullScreen,
    onClose,
    onDelete,
    onExitFullScreen,
    onOpenMenu,
  ])
}

export default useViewerKeyboard
