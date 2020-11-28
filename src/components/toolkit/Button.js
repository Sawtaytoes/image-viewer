import { css } from '@emotion/core'
import PropTypes from 'prop-types'
import {
	memo,
	useMemo,
} from 'react'

const buttonStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 24px;
	font-weight: 300;
	width: 120px;
	padding-top: 10px;
	padding-bottom: 10px;
	padding-left: 0;
	padding-right: 0;
	border-radius: 5px;
	border: 0;
`

const buttonTypes = {
	negative: 'negative',
	positive: 'positive',
}

const buttonTypeStyles = {
	[buttonTypes.negative]: (
		css`
			color: white;
			background-color: red;
		`
	),
	[buttonTypes.positive]: (
		css`
			color: white;
			background-color: green;
		`
	),
}

const propTypes = {
	children: PropTypes.node.isRequired,
	onClick: PropTypes.func.isRequired,
	type: (
		PropTypes
		.oneOf(
			Object
			.keys(
				buttonTypes
			)
		)
		.isRequired
	),
}

const ConfirmationModal = ({
	children,
	onClick,
	type,
}) => {
	const configuredButtonStyles = (
		useMemo(
			() => (
				css`
					${buttonStyles}
					${buttonTypeStyles[type]}
				`
			),
			[type],
		)
	)

	return (
		<button
			css={configuredButtonStyles}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	)
}

ConfirmationModal.propTypes = propTypes

const MemoizedConfirmationModal = memo(ConfirmationModal)

export default MemoizedConfirmationModal
