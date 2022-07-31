import { css } from '@emotion/react'
import PropTypes from 'prop-types'
import { memo } from 'react'

import Button from './Button'
import useKeyboardControls from '../convenience/useKeyboardControls'

const choicesStyles = css`
	align-items: center;
	display: flex;
	justify-content: center;
`

const choiceButtonStyles = css`
	&:first-of-type {
		margin-right: 20%;
	}

	&:last-of-type {
		margin-left: 20%;
	}
`

const confirmationModalStyles = css`
	align-items: center;
	background-color: rgba(51, 51, 51, 0.9);
	display: flex;
	flex-direction: column;
	height: 100%;
	justify-content: center;
	left: 0;
	position: fixed;
	top: 0;
	width: 100%;
	z-index: 99999;
`

const messageStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 32px;
	font-weight: 400;
	margin-bottom: 100px;
	text-align: center;
`

const propTypes = {
	children: PropTypes
	.node
	.isRequired,
	closeButtonText: PropTypes
	.string
	.isRequired,
	confirmButtonText: PropTypes
	.string
	.isRequired,
	isVisible: PropTypes.bool,
	onClose: PropTypes
	.func
	.isRequired,
	onConfirm: PropTypes
	.func
	.isRequired,
}

const ConfirmationModal = ({
	children,
	closeButtonText,
	confirmButtonText,
	isVisible = false,
	onClose,
	onConfirm,
}) => {
	useKeyboardControls(event => {
		if (!isVisible) {
			return
		}

		// Since we don't have a keydown provider, we have to use `setTimeout` to ensure this is the last listener to run. Prevents timing issues where this runs before `FileBrowser`.
		setTimeout(() => {
			if (
				event.code === 'Backspace'
				|| event.code === 'Escape'
			) {
				onClose()
			}
			else if (
				event.code === 'Enter'
			) {
				onConfirm()
			}
		})
	})

	return (
		isVisible
		? (
			<div css={confirmationModalStyles}>
				<div css={messageStyles}>
					{children}
				</div>

				<div css={choicesStyles}>
					<div css={choiceButtonStyles}>
						<Button
							onClick={onClose}
							type="negative"
						>
							{closeButtonText}
						</Button>
					</div>

					<div css={choiceButtonStyles}>
						<Button
							onClick={onConfirm}
							type="positive"
						>
							{confirmButtonText}
						</Button>
					</div>
				</div>
			</div>
		)
		: null
	)
}

ConfirmationModal.propTypes = propTypes

const MemoizedConfirmationModal = memo(ConfirmationModal)

export default MemoizedConfirmationModal
