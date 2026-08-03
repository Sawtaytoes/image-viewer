import type { ReactNode } from "react"

interface SvgIconProps {
  children: ReactNode
}

// Minimal Material-style icon wrapper. Replaces @material-ui/icons (only four
// glyphs were ever used). 24px, inherits color from `currentColor`.
//
// Typed on the parameter rather than as `FC<SvgIconProps>`: `FC` would add its
// own implicit `children` on top of the declared one, and the whole point of
// this component is that the glyph paths are the children it renders.
const SvgIcon = ({ children }: SvgIconProps) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    focusable="false"
    height="24"
    viewBox="0 0 24 24"
    width="24"
  >
    {children}
  </svg>
)

export default SvgIcon
