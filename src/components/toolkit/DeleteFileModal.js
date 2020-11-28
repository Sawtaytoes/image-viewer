import { memo } from 'react'

import ConfirmationModal from './ConfirmationModal'

const propTypes = {
	isVisible: ConfirmationModal.type.propTypes.isVisible,
	onClose: ConfirmationModal.type.propTypes.onClose,
	onConfirm: ConfirmationModal.type.propTypes.onConfirm,
}

const DeleteFileModal = ({
	isVisible,
	onClose,
	onConfirm,
}) => (
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

DeleteFileModal.propTypes = propTypes

const MemoizedDeleteFileModal = memo(DeleteFileModal)

export default MemoizedDeleteFileModal
