import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo } from "react"

// Ring geometry. Kept module-level so the circumference is computed once.
const RADIUS = 20
const STROKE_WIDTH = 4
const SIZE = (RADIUS + STROKE_WIDTH) * 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Centered, non-interactive overlay so it can sit on top of a tile without
// stealing the pointer events that drive the long-press underneath.
const overlayStyles = css`
	align-items: center;
	display: flex;
	inset: 0;
	justify-content: center;
	pointer-events: none;
	position: absolute;
`

const trackStyles = css`
	fill: none;
	stroke: rgba(255, 255, 255, 0.25);
	stroke-width: ${STROKE_WIDTH};
`

// Rotated so the fill grows clockwise from the top.
const ringStyles = css`
	fill: none;
	stroke: #fafafa;
	stroke-linecap: round;
	stroke-width: ${STROKE_WIDTH};
	transform: rotate(-90deg);
	transform-origin: center;
`

const propTypes = {
  progress: PropTypes.number.isRequired,
}

const FillRing = ({ progress }) => {
  const clampedProgress = Math.min(1, Math.max(0, progress))

  const strokeDashoffset =
    CIRCUMFERENCE * (1 - clampedProgress)

  return (
    <div css={overlayStyles}>
      <svg
        aria-hidden="true"
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
      >
        <circle
          css={trackStyles}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
        />

        <circle
          css={ringStyles}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
    </div>
  )
}

FillRing.propTypes = propTypes

const MemoizedFillRing = memo(FillRing)

export default MemoizedFillRing
