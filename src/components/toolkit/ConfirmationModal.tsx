import { Button, Modal } from "@charcuterie/ui"
import { memo } from "react"

import useKeyboardControls from "../convenience/useKeyboardControls"

// `@charcuterie/ui`'s `Modal` is a real `<dialog>` opened with `showModal()`, so
// the platform now owns the three things this file hand-rolled: the top layer
// (no `z-[99999]`), the focus trap, and `::backdrop` (no full-viewport `<div>`).
// The `isRendered` state that kept the old markup mounted through its close
// animation is gone with them — see `src/styles/tailwind.css`, where a
// `@starting-style` + `allow-discrete` transition animates the dialog both ways
// off `[open]` itself, which is what the JS unmount-on-`animationend` was
// simulating.
//
// The two buttons still splay to opposite ends. That is the mis-tap guard the
// delete-confirmation decision asks for in layout form
// (`docs/decisions/2026-06-03-delete-needs-confirmation-and-guards-stray-delete-key.md`),
// so the footer is `justify-between` rather than the library's default
// `justify-end` — inside a dialog that is now `max-w-md` rather than the whole
// viewport, which is why it is a full-width flex row rather than the old 20%
// margins.
const footerClassName =
  "flex w-full items-center justify-between gap-4"

export interface ConfirmationModalProps {
  closeButtonText: string
  confirmButtonText: string
  isVisible?: boolean
  // Was `children`. `Modal` names its dialog from `heading`, which is a string
  // — and the question *is* the name here, so putting it in the body and
  // inventing a shorter title would give a screen reader the invented one and
  // leave the question unread until it walked into the dialog.
  message: string
  onClose: () => void
  onConfirm: () => void
}

const ConfirmationModal = ({
  closeButtonText,
  confirmButtonText,
  isVisible = false,
  message,
  onClose,
  onConfirm,
}: ConfirmationModalProps) => {
  // Escape and the outside click belong to `Modal` now (`onCancel`, and a
  // target/currentTarget compare on the `<dialog>` — a press on a backdrop
  // targets the dialog itself), so only the two keys the platform has no
  // opinion about are left here. Backspace stays because this app's whole
  // keyboard treats it as "back".
  useKeyboardControls((event: KeyboardEvent) => {
    if (!isVisible) {
      return
    }

    // Since we don't have a keydown provider, we have to use `setTimeout` to ensure this is the last listener to run. Prevents timing issues where this runs before `FileBrowser`.
    setTimeout(() => {
      if (event.code === "Backspace") {
        onClose()
      } else if (event.code === "Enter") {
        onConfirm()
      }
    })
  })

  return (
    <Modal
      footer={
        <div className={footerClassName}>
          <Button
            intent="danger"
            onClick={onClose}
            size="lg"
          >
            {closeButtonText}
          </Button>

          <Button
            intent="success"
            onClick={onConfirm}
            size="lg"
          >
            {confirmButtonText}
          </Button>
        </div>
      }
      heading={message}
      isVisible={isVisible}
      onClose={onClose}
    />
  )
}

const MemoizedConfirmationModal = memo(ConfirmationModal)

export default MemoizedConfirmationModal
