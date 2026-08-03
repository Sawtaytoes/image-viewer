import { memo } from "react"

import ChevronDownIcon from "../icons/ChevronDownIcon"
import GridIcon from "../icons/GridIcon"
import type {
  SpawnTapFeedback,
  TapFeedbackVariant,
} from "./useTapFeedback"

// Where a tap (or a completed hold) landed, in client coordinates. Every
// surface that reports one — the center zone, the empty-pane affordance, the
// per-column menu — hands it straight to `spawn`, so it is that payload minus
// the variant rather than a second shape free to drift from it.
export type TapPoint = Omit<SpawnTapFeedback, "variant">

// Variants map to the two indicators: a grid glyph for "close back to gallery",
// a chevron for "chrome revealed".
const variantIcons = {
  close: GridIcon,
  reveal: ChevronDownIcon,
}

interface TapFeedbackProps {
  onDone: () => void
  variant: TapFeedbackVariant
  x: number
  y: number
}

// The 250ms both animations run for now lives in `--animate-tap-ripple` /
// `--animate-tap-pulse` (`src/styles/tailwind.css`). It used to be a constant
// here, interpolated into the Emotion `animation` shorthand; Tailwind cannot
// interpolate, and `onDone` fires off `animationend` rather than a timer, so
// nothing in this file needs the number.
const TapFeedback = ({
  onDone,
  variant,
  x,
  y,
}: TapFeedbackProps) => {
  const VariantIcon = variantIcons[variant]

  return (
    // The tap point is measured at runtime, so it is an inline `style`: a
    // `left-[${x}px]` class is text Tailwind never scans and generates no CSS
    // at all — the feedback would still render, silently, at the corner.
    <div
      className="pointer-events-none absolute"
      onAnimationEnd={onDone}
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      <span className="absolute top-[-24px] left-[-24px] h-[48px] w-[48px] animate-tap-ripple rounded-full border-2 border-content-primary" />

      <span className="absolute top-[-12px] left-[-12px] animate-tap-pulse text-content-primary">
        <VariantIcon />
      </span>
    </div>
  )
}

const MemoizedTapFeedback = memo(TapFeedback)

export default MemoizedTapFeedback
