import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  Fragment,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import AddIcon from "../icons/AddIcon"
import ArrowBackIcon from "../icons/ArrowBackIcon"
import FolderTabStrip from "../workspace/FolderTabStrip"
import WorkspaceContext from "../workspace/WorkspaceContext"
import ImageViewerContext from "./ImageViewerContext"
import useEdgeSwipe from "./useEdgeSwipe"

const AUTO_HIDE_MS = 3000

// Thin top hit-strip that listens for the summon swipe even while the bar is
// hidden. Hovering it reveals the bar (the mouse has no implicit pointer
// capture, so the touch swipe alone leaves `+` unreachable with a mouse).
const hitStripStyles = css`
	height: 32px;
	left: 0;
	position: fixed;
	top: 0;
	touch-action: none;
	width: 100%;
	z-index: 2;
`

// Faint pill hinting the bar can be pulled/hovered down; only shown while the
// bar is hidden so it doesn't sit on top of the revealed chrome.
const grabHandleStyles = css`
	background-color: rgba(255, 255, 255, 0.25);
	border-radius: 2px;
	height: 4px;
	left: 50%;
	position: absolute;
	top: 6px;
	transform: translateX(-50%);
	width: 36px;
`

const chromeBarStyles = css`
	align-items: center;
	background-color: rgba(34, 34, 34, 0.95);
	display: flex;
	gap: 8px;
	left: 0;
	padding: 6px 8px;
	position: fixed;
	top: 0;
	touch-action: none;
	transition: transform 220ms ease;
	width: 100%;
	z-index: 3;
`

const chromeButtonStyles = css`
	align-items: center;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	display: inline-flex;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 16px;
	font-weight: 300;
	gap: 4px;
	padding: 6px 10px;

	&:hover {
		background-color: rgba(255, 255, 255, 0.15);
	}
`

const tabStripSlotStyles = css`
	flex: 1 1 auto;
	min-width: 0;
`

const propTypes = {
  spawn: PropTypes.func.isRequired,
}

const RevealableChrome = ({ spawn }) => {
  const { addPane, clearPanes } = useContext(
    WorkspaceContext,
  )

  const { leaveImageViewer } = useContext(
    ImageViewerContext,
  )

  const [isVisible, setIsVisible] = useState(true)

  const autoHideTimerRef = useRef()
  const hitStripRef = useRef()

  const scheduleAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    autoHideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false)
    }, AUTO_HIDE_MS)
  }, [])

  const reveal = useCallback(
    (point) => {
      setIsVisible(true)

      if (point) {
        spawn({ variant: "reveal", x: point.x, y: 16 })
      }

      scheduleAutoHide()
    },
    [scheduleAutoHide, spawn],
  )

  const dismiss = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    setIsVisible(false)
  }, [])

  // Mouse summon: hovering the top edge reveals the bar (no feedback ripple —
  // it would spam on every pointer enter).
  const onHitStripPointerEnter = useCallback(() => {
    reveal()
  }, [reveal])

  // Keep the bar up while the pointer is over it; reschedule the hide on leave.
  const cancelAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    setIsVisible(true)
  }, [])

  const onReveal = useCallback(
    ({ x }) => {
      reveal({ x })
    },
    [reveal],
  )

  useEdgeSwipe({
    domElementRef: hitStripRef,
    onDismiss: dismiss,
    onReveal,
  })

  // Show briefly on open so the controls are discoverable, then auto-hide.
  useEffect(() => {
    scheduleAutoHide()

    return () => {
      window.clearTimeout(autoHideTimerRef.current)
    }
  }, [scheduleAutoHide])

  const goToFolders = useCallback(() => {
    clearPanes()

    leaveImageViewer()
  }, [clearPanes, leaveImageViewer])

  const onAddPane = useCallback(() => {
    addPane()

    reveal()
  }, [addPane, reveal])

  const barStyles = useMemo(
    () => css`
			${chromeBarStyles}
			transform: translateY(${isVisible ? "0" : "-100%"});
		`,
    [isVisible],
  )

  return (
    <Fragment>
      <div
        css={hitStripStyles}
        onPointerEnter={onHitStripPointerEnter}
        ref={hitStripRef}
      >
        {!isVisible && <div css={grabHandleStyles} />}
      </div>

      <div
        css={barStyles}
        onPointerDown={scheduleAutoHide}
        onPointerEnter={cancelAutoHide}
        onPointerLeave={scheduleAutoHide}
      >
        <button
          css={chromeButtonStyles}
          onClick={goToFolders}
          type="button"
        >
          <ArrowBackIcon />
          Folders
        </button>

        <div css={tabStripSlotStyles}>
          <FolderTabStrip />
        </div>

        <button
          aria-label="Add column"
          css={chromeButtonStyles}
          onClick={onAddPane}
          type="button"
        >
          <AddIcon />
        </button>
      </div>
    </Fragment>
  )
}

RevealableChrome.propTypes = propTypes

const MemoizedRevealableChrome = memo(RevealableChrome)

export default MemoizedRevealableChrome
