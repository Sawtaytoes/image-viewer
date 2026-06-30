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
//
// `z-index: 1` sits above plain column content but *below* a pane that's
// showing its gallery/menu (those elevate to `z-index: 2`, see `Pane`), so the
// gallery's own top controls — the up-a-folder button especially — stay
// tappable instead of being swallowed by this strip's hover-to-reveal.
const hitStripStyles = css`
	height: 32px;
	left: 0;
	position: fixed;
	top: 0;
	touch-action: none;
	width: 100%;
	z-index: 1;
`

// Faint pill hinting the bar can be pulled/hovered down; only shown while the
// bar is hidden so it doesn't sit on top of the revealed chrome. Sized up so
// it's an obvious grab target for the drag-down-to-reveal gesture.
const grabHandleStyles = css`
	background-color: rgba(255, 255, 255, 0.3);
	border-radius: 3px;
	height: 6px;
	left: 50%;
	position: absolute;
	top: 8px;
	transform: translateX(-50%);
	width: 64px;
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
  // Chrome visibility lives in `ImageViewer` so the active column can outline
  // itself while the bar is up; this component owns every transition of it.
  isVisible: PropTypes.bool.isRequired,
  setIsVisible: PropTypes.func.isRequired,
  spawn: PropTypes.func.isRequired,
  // The full-viewer element the drag-down-to-reveal gesture listens on, so the
  // swipe can start anywhere in the top portion of the screen, not just the
  // thin top strip.
  viewerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }).isRequired,
}

const RevealableChrome = ({
  isVisible,
  setIsVisible,
  spawn,
  viewerRef,
}) => {
  const {
    addPaneAndFill,
    clearPanes,
    isChromeRevealSuppressed,
  } = useContext(WorkspaceContext)

  const { leaveImageViewer } = useContext(
    ImageViewerContext,
  )

  const autoHideTimerRef = useRef()
  const hitStripRef = useRef()

  const scheduleAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    autoHideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false)
    }, AUTO_HIDE_MS)
  }, [setIsVisible])

  const reveal = useCallback(
    (point) => {
      setIsVisible(true)

      if (point) {
        spawn({ variant: "reveal", x: point.x, y: 16 })
      }

      scheduleAutoHide()
    },
    [scheduleAutoHide, setIsVisible, spawn],
  )

  const dismiss = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    setIsVisible(false)
  }, [setIsVisible])

  // Mouse summon: actually moving the pointer over the top edge reveals the bar.
  // Closing a pane's gallery/menu unmounts it from above this strip, and Chromium
  // then fires boundary + `pointermove` events on the strip (now under a
  // stationary cursor) to refresh `:hover` — with no real motion, so movementX/Y
  // are 0. Those used to pop the chrome open on every gallery close and cover the
  // close button before a second click landed. Requiring genuine movement ignores
  // the synthetic refresh while a real hover (always moving) still summons. Touch
  // reveals via the edge swipe below, never here.
  const onHitStripPointerMove = useCallback(
    (event) => {
      if (event.pointerType !== "mouse") {
        return
      }

      // A pane's gallery/menu just closed: the browser fires a pointer event on
      // this strip (now exposed under the stationary cursor) that we must not
      // treat as a hover. See `suppressChromeReveal` in WorkspaceProvider.
      if (isChromeRevealSuppressed) {
        return
      }

      if (event.movementX === 0 && event.movementY === 0) {
        return
      }

      reveal()
    },
    [isChromeRevealSuppressed, reveal],
  )

  // Keep the bar up while the pointer is over it; reschedule the hide on leave.
  const cancelAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    setIsVisible(true)
  }, [setIsVisible])

  const onReveal = useCallback(
    ({ x }) => {
      reveal({ x })
    },
    [reveal],
  )

  // Touch summon: a downward drag that starts anywhere in the top ~40% of the
  // viewer reveals the bar (an upward drag dismisses it). Listening on the whole
  // viewer — not just the thin top strip — makes the queue far easier to pull up
  // by touch. Gestures that start inside a pane's gallery/menu are ignored so
  // they don't fight that overlay's own scrolling/taps (see `useEdgeSwipe`).
  useEdgeSwipe({
    domElementRef: viewerRef,
    edgeRatio: 0.4,
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
    addPaneAndFill()

    reveal()
  }, [addPaneAndFill, reveal])

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
        onPointerMove={onHitStripPointerMove}
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
