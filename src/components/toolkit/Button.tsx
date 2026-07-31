import type { MouseEventHandler, ReactNode } from "react"
import { memo } from "react"

// The component in this file was called `ConfirmationModal` — a copy-paste from
// the modal that renders it, in a file called `Button.jsx` exporting a
// `MemoizedConfirmationModal`. It is a button; it is now named one.

// `#fafafa`-on-`red` / `-on-green` became the danger and success intents, whose
// `on-solid` foreground is the token that answers to the scheme. The sizes are
// the original pixels on purpose — the type ramp is density-aware and adopting
// it is phase 2's (see docs/typescript-and-tailwind-conventions.md).
const buttonClassName =
  "cursor-pointer rounded-[5px] border-0 px-6 py-[10px] text-[24px] font-light whitespace-nowrap transition-[filter,transform] duration-100 ease-[ease] hover:brightness-[1.15] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-primary active:scale-[0.96] active:brightness-[0.85] min-w-[120px]"

export type ButtonType = "negative" | "positive"

// Whole class strings, one per type, because Tailwind generates utilities by
// scanning source text: a class assembled from the `type` value at runtime
// (`bg-intent-${type}-solid`) would compile, render, and produce no CSS at all.
const buttonTypeClassNames: {
  readonly [Type in ButtonType]: string
} = {
  negative:
    "bg-intent-danger-solid text-intent-danger-on-solid",
  positive:
    "bg-intent-success-solid text-intent-success-on-solid",
}

interface ButtonProps {
  children: ReactNode
  onClick: MouseEventHandler<HTMLButtonElement>
  type: ButtonType
}

const Button = ({
  children,
  onClick,
  type,
}: ButtonProps) => (
  <button
    className={`${buttonClassName} ${buttonTypeClassNames[type]}`}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
)

const MemoizedButton = memo(Button)

export default MemoizedButton
