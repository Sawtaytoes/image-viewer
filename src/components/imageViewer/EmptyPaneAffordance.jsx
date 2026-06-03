import { css } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useCallback, useState } from "react"

import AddIcon from "../icons/AddIcon"
import FolderPickerPopover from "./FolderPickerPopover"

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
  paneId: PropTypes.string.isRequired,
}

const EmptyPaneAffordance = ({ paneId }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const openPicker = useCallback(() => {
    setIsPickerOpen(true)
  }, [])

  const closePicker = useCallback(() => {
    setIsPickerOpen(false)
  }, [])

  return (
    <div css={emptyPaneStyles} onPointerDown={openPicker}>
      <AddIcon />

      <div css={labelStyles}>Tap to pick folder</div>

      {isPickerOpen && (
        <FolderPickerPopover
          onClose={closePicker}
          paneId={paneId}
        />
      )}
    </div>
  )
}

EmptyPaneAffordance.propTypes = propTypes

const MemoizedEmptyPaneAffordance = memo(
  EmptyPaneAffordance,
)

export default MemoizedEmptyPaneAffordance
