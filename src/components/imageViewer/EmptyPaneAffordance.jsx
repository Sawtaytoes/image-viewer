import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useCallback } from "react"

import AddIcon from "../icons/AddIcon"

const emptyPaneStyles = css`
	align-items: center;
	color: #888;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	gap: 8px;
	height: 100%;
	justify-content: center;
	width: 100%;
`

const labelStyles = css`
	font-size: 18px;
`

const propTypes = {
  onActivate: PropTypes.func.isRequired,
}

// Presentational: just the `+`/label. The owning Pane opens the per-column menu
// (FolderPickerPopover) from the activation point.
const EmptyPaneAffordance = ({ onActivate }) => {
  // `click`, not `pointerdown`: opening the menu over this affordance must not
  // let the same tap's trailing events reach what's underneath.
  const onActivateClick = useCallback(
    (event) => {
      event.stopPropagation()

      onActivate({ x: event.clientX, y: event.clientY })
    },
    [onActivate],
  )

  return (
    <div css={emptyPaneStyles} onClick={onActivateClick}>
      <AddIcon />

      <div css={labelStyles}>Tap to pick folder</div>
    </div>
  )
}

EmptyPaneAffordance.propTypes = propTypes

const MemoizedEmptyPaneAffordance = memo(
  EmptyPaneAffordance,
)

export default MemoizedEmptyPaneAffordance
