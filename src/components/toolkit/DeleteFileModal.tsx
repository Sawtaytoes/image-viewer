import { memo } from "react"

import type { ConfirmationModalProps } from "./ConfirmationModal"
import ConfirmationModal from "./ConfirmationModal"

// Was `ConfirmationModal.type.propTypes.isVisible` and friends — reaching
// through `memo`'s wrapper into the inner component's runtime `propTypes` object
// to borrow three validators. `Pick` says the same thing to the compiler, and
// says it about the props the modal actually declares.
type DeleteFileModalProps = Pick<
  ConfirmationModalProps,
  "isVisible" | "onClose" | "onConfirm"
>

const DeleteFileModal = ({
  isVisible,
  onClose,
  onConfirm,
}: DeleteFileModalProps) => (
  <ConfirmationModal
    closeButtonText="No"
    confirmButtonText="Yes"
    isVisible={isVisible}
    onClose={onClose}
    onConfirm={onConfirm}
  >
    Are you sure you want to delete this file or directory?
  </ConfirmationModal>
)

const MemoizedDeleteFileModal = memo(DeleteFileModal)

export default MemoizedDeleteFileModal
