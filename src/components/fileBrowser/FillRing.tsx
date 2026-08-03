import { memo } from "react"

// Ring geometry. Kept module-level so the circumference is computed once.
const RADIUS = 20
const STROKE_WIDTH = 4
const SIZE = (RADIUS + STROKE_WIDTH) * 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface FillRingProps {
  progress: number
}

const FillRing = ({ progress }: FillRingProps) => {
  const clampedProgress = Math.min(1, Math.max(0, progress))

  const strokeDashoffset =
    CIRCUMFERENCE * (1 - clampedProgress)

  return (
    // Centered, non-interactive overlay so it can sit on top of a tile without
    // stealing the pointer events that drive the long-press underneath.
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        aria-hidden="true"
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
      >
        {/* The width stays the `strokeWidth` SVG attribute rather than a
            `stroke-[4px]` utility: it is derived from `STROKE_WIDTH`, which
            `SIZE` also depends on, and a hardcoded utility would silently drift
            from the geometry the moment that constant changes. */}
        <circle
          className="fill-none stroke-content-primary/25"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
        />

        {/* Rotated so the fill grows clockwise from the top. */}
        <circle
          className="-rotate-90 origin-center fill-none stroke-content-primary [stroke-linecap:round]"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
    </div>
  )
}

const MemoizedFillRing = memo(FillRing)

export default MemoizedFillRing
