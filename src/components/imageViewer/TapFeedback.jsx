import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useMemo } from "react"

import ChevronDownIcon from "../icons/ChevronDownIcon"
import GridIcon from "../icons/GridIcon"

const FEEDBACK_DURATION_MS = 250

const ripple = keyframes`
	from {
		opacity: 0.5;
		transform: scale(0);
	}
	to {
		opacity: 0;
		transform: scale(3);
	}
`

const pulse = keyframes`
	0% {
		opacity: 0;
		transform: scale(0.6);
	}
	40% {
		opacity: 1;
		transform: scale(1.1);
	}
	100% {
		opacity: 0;
		transform: scale(1);
	}
`

const rippleStyles = css`
	animation: ${ripple} ${FEEDBACK_DURATION_MS}ms ease-out forwards;
	border: 2px solid #fafafa;
	border-radius: 50%;
	height: 48px;
	left: -24px;
	position: absolute;
	top: -24px;
	width: 48px;
`

const iconStyles = css`
	animation: ${pulse} ${FEEDBACK_DURATION_MS}ms ease forwards;
	color: #fafafa;
	left: -12px;
	position: absolute;
	top: -12px;
`

// Variants map to the two indicators: a grid glyph for "close back to gallery",
// a chevron for "chrome revealed".
const variantIcons = {
  close: GridIcon,
  reveal: ChevronDownIcon,
}

const propTypes = {
  onDone: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(Object.keys(variantIcons))
    .isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
}

const TapFeedback = ({ onDone, variant, x, y }) => {
  const containerStyles = useMemo(
    () => css`
			left: ${x}px;
			pointer-events: none;
			position: absolute;
			top: ${y}px;
		`,
    [x, y],
  )

  const VariantIcon = variantIcons[variant]

  return (
    <div css={containerStyles} onAnimationEnd={onDone}>
      <span css={rippleStyles} />

      <span css={iconStyles}>
        <VariantIcon />
      </span>
    </div>
  )
}

TapFeedback.propTypes = propTypes

const MemoizedTapFeedback = memo(TapFeedback)

export default MemoizedTapFeedback
