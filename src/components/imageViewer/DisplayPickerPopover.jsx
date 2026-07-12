import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useEffect,
  useState,
} from "react"

import NewWindowIcon from "../icons/NewWindowIcon"

// The "spawn window on another display" menu. Opened from the viewer chrome bar,
// it lists every connected display; hovering a row lights up that physical
// monitor (the identify overlay in main) so the user knows which screen they're
// about to target, and clicking a row spawns a new window filling it — sharing
// the live queue and starting with one auto-filled column. Mirrors the
// backdrop + pop-in visual pattern of `FolderPickerPopover`.
const backdropFadeIn = keyframes`
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
`

const popoverPopIn = keyframes`
	from {
		opacity: 0;
		transform: scale(0.92);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
`

// Fixed + full-viewport (not absolute-in-pane like the per-column picker): this
// menu is summoned from the chrome bar, so it floats above the whole viewer.
const backdropStyles = css`
	align-items: center;
	animation: ${backdropFadeIn} 140ms ease;
	background-color: rgba(0, 0, 0, 0.6);
	display: flex;
	inset: 0;
	justify-content: center;
	position: fixed;
	z-index: 10;
`

const popoverStyles = css`
	animation: ${popoverPopIn} 160ms ease;
	background-color: #2b2b2b;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
	color: #fafafa;
	display: flex;
	flex-direction: column;
	font-family: 'Source Sans Pro', sans-serif;
	gap: 4px;
	max-height: 85%;
	max-width: 92%;
	min-width: 420px;
	overflow-y: auto;
	padding: 12px;
	user-select: none;
`

const titleStyles = css`
	color: #cfcfcf;
	font-size: 18px;
	font-weight: 400;
	padding: 8px 14px 4px;
`

const rowStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 8px;
	color: #fafafa;
	cursor: pointer;
	display: flex;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	gap: 14px;
	padding: 16px 18px;
	text-align: left;

	&:hover {
		background-color: #3d3d3d;
	}

	svg {
		flex: 0 0 auto;
		height: 28px;
		width: 28px;
	}
`

const rowTextStyles = css`
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
`

const rowNameStyles = css`
	font-size: 22px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const rowMetaStyles = css`
	color: #aaa;
	font-size: 16px;
`

const emptyMessageStyles = css`
	color: #aaa;
	font-size: 18px;
	font-weight: 300;
	padding: 20px;
`

const propTypes = {
  onClose: PropTypes.func.isRequired,
}

const DisplayPickerPopover = ({ onClose }) => {
  const [displays, setDisplays] = useState([])

  // Fetch the display list when the menu opens (so a monitor plugged in
  // mid-session shows up), and make sure no identify overlay lingers once the
  // menu closes.
  useEffect(() => {
    let isMounted = true

    Promise.resolve(window.api.getDisplays()).then(
      (list) => {
        if (isMounted) {
          setDisplays(list)
        }
      },
    )

    return () => {
      isMounted = false

      window.api.stopIdentifyDisplay()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  const onBackdropClick = useCallback(
    (event) => {
      event.stopPropagation()

      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  const identify = useCallback((displayId) => {
    window.api.identifyDisplay(displayId)
  }, [])

  const stopIdentify = useCallback(() => {
    window.api.stopIdentifyDisplay()
  }, [])

  const spawnOnDisplay = useCallback(
    (displayId) => {
      window.api.stopIdentifyDisplay()

      window.api.createNewWindow({
        displayId,
        spawnedViewer: true,
      })

      onClose()
    },
    [onClose],
  )

  return (
    <div
      css={backdropStyles}
      data-viewer-overlay
      onClick={onBackdropClick}
    >
      <div css={popoverStyles}>
        <div css={titleStyles}>Open a new window on…</div>

        {displays.length === 0 ? (
          <div css={emptyMessageStyles}>
            No displays detected.
          </div>
        ) : (
          displays.map((display) => (
            <button
              css={rowStyles}
              key={display.id}
              onClick={() => {
                spawnOnDisplay(display.id)
              }}
              onPointerEnter={() => {
                identify(display.id)
              }}
              onPointerLeave={stopIdentify}
              type="button"
            >
              <NewWindowIcon />

              <span css={rowTextStyles}>
                <span css={rowNameStyles}>
                  {display.label}
                </span>
                <span css={rowMetaStyles}>
                  {display.resolutionLabel}
                  {display.isPrimary ? " · primary" : ""}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

DisplayPickerPopover.propTypes = propTypes

const MemoizedDisplayPickerPopover = memo(
  DisplayPickerPopover,
)

export default MemoizedDisplayPickerPopover
