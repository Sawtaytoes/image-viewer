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
// hidden.
const hitStripStyles = css`
	height: 32px;
	left: 0;
	position: fixed;
	top: 0;
	touch-action: none;
	width: 100%;
	z-index: 2;
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
      <div css={hitStripStyles} ref={hitStripRef} />

      <div css={barStyles} onPointerDown={scheduleAutoHide}>
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
