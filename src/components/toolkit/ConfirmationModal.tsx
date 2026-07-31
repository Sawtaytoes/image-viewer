import type {
  AnimationEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react"
import { memo, useEffect, useState } from "react"

import useKeyboardControls from "../convenience/useKeyboardControls"
import Button from "./Button"

// The four Emotion `keyframes` are `--animate-*` theme values in
// `src/styles/tailwind.css` now, named below with `animate-*`. `ANIMATION_DURATION_MS`
// went with them: it only ever existed to be interpolated into the shorthand,
// and the modal unmounts on `animationend` rather than on a timer.
const backdropClassName =
  "fixed top-0 left-0 z-[99999] flex h-full w-full flex-col items-center justify-center bg-surface-overlay"

const contentClassName = "flex flex-col items-center"

const messageClassName =
  "mb-[100px] text-center text-[32px] font-normal"

const choicesClassName = "flex items-center justify-center"

// The two buttons splay apart so a mis-tap can't hit the wrong one — the guard
// the delete-confirmation decision asks for, in layout form.
const choiceButtonClassName =
  "first-of-type:mr-[20%] last-of-type:ml-[20%]"

export interface ConfirmationModalProps {
  children: ReactNode
  closeButtonText: string
  confirmButtonText: string
  isVisible?: boolean
  onClose: () => void
  onConfirm: () => void
}

const ConfirmationModal = ({
  children,
  closeButtonText,
  confirmButtonText,
  isVisible = false,
  onClose,
  onConfirm,
}: ConfirmationModalProps) => {
  // Stay mounted while the close animation plays, then unmount once it finishes.
  const [isRendered, setIsRendered] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true)
    }
  }, [isVisible])

  useKeyboardControls((event: KeyboardEvent) => {
    if (!isVisible) {
      return
    }

    // Since we don't have a keydown provider, we have to use `setTimeout` to ensure this is the last listener to run. Prevents timing issues where this runs before `FileBrowser`.
    setTimeout(() => {
      if (
        event.code === "Backspace" ||
        event.code === "Escape"
      ) {
        onClose()
      } else if (event.code === "Enter") {
        onConfirm()
      }
    })
  })

  const onBackdropAnimationEnd: AnimationEventHandler<
    HTMLDivElement
  > = (event) => {
    // Only the backdrop's own fade-out should unmount (ignore bubbling from the content animation).
    if (
      event.target === event.currentTarget &&
      !isVisible
    ) {
      setIsRendered(false)
    }
  }

  const onBackdropClick: MouseEventHandler<
    HTMLDivElement
  > = (event) => {
    // Clicking the backdrop (but not the message or buttons) dismisses the modal without confirming.
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isRendered) {
    return null
  }

  return (
    <div
      className={`${backdropClassName} ${
        isVisible
          ? "animate-backdrop-fade-in"
          : "animate-backdrop-fade-out"
      }`}
      onAnimationEnd={onBackdropAnimationEnd}
      onClick={onBackdropClick}
    >
      <div
        className={`${contentClassName} ${
          isVisible
            ? "animate-modal-scale-in"
            : "animate-modal-scale-out"
        }`}
      >
        <div className={messageClassName}>{children}</div>

        <div className={choicesClassName}>
          <div className={choiceButtonClassName}>
            <Button onClick={onClose} type="negative">
              {closeButtonText}
            </Button>
          </div>

          <div className={choiceButtonClassName}>
            <Button onClick={onConfirm} type="positive">
              {confirmButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MemoizedConfirmationModal = memo(ConfirmationModal)

export default MemoizedConfirmationModal
