import PropTypes from "prop-types"

// Minimal Material-style icon wrapper. Replaces @material-ui/icons (only four
// glyphs were ever used). 24px, inherits color from `currentColor`.
const SvgIcon = ({ children }) => (
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

SvgIcon.propTypes = {
  children: PropTypes.node.isRequired,
}

export default SvgIcon
