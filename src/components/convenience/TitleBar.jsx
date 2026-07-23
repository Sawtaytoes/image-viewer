import { css } from "@emotion/react"
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import FileSystemContext from "../fileBrowser/FileSystemContext"
import FullscreenExitIcon from "../icons/FullscreenExitIcon"
import FullscreenIcon from "../icons/FullscreenIcon"
import ImageViewerContext from "../imageViewer/ImageViewerContext"
import useEdgeSwipe from "../imageViewer/useEdgeSwipe"
import WorkspaceContext from "../workspace/WorkspaceContext"
import FullScreenContext from "./FullScreenContext"
import TITLE_BAR_HEIGHT from "./titleBarHeight"

const pathApi = window.api.path

// Reserve room on the right for the native window controls the `titleBarOverlay`
// paints there (Windows/macOS) so the fullscreen button can hug them without
// sitting underneath. In fullscreen the OS hides those controls, so the button
// reclaims the space (see `barStyles`).
const WINDOW_CONTROLS_WIDTH = 140

// Brief window of visibility after entering fullscreen before the bar hides
// itself — long enough to notice the exit control, matching the viewer chrome.
const AUTO_HIDE_MS = 3000

// The whole strip is a drag handle (`-webkit-app-region: drag`) so the frameless
// window can still be moved; interactive children opt back out with `no-drag`.
// The right edge is left as empty drag space for the native window controls that
// `titleBarOverlay` paints there (Windows/macOS), so nothing sits under them.
const titleBarStyles = css`
	-webkit-app-region: drag;
	align-items: center;
	background-color: #2b2b2b;
	color: #fafafa;
	display: flex;
	gap: 6px;
	height: ${TITLE_BAR_HEIGHT}px;
	left: 0;
	padding: 0 10px;
	position: fixed;
	right: 0;
	top: 0;
	user-select: none;
	z-index: 10000;
`

const appNameStyles = css`
	color: #d6d6d6;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
`

const buttonStyles = css`
	-webkit-app-region: no-drag;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 13px;
	font-weight: 400;
	padding: 5px 10px;
	white-space: nowrap;

	&:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.12);
	}

	&:active:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.2);
	}

	&:disabled {
		color: #777;
		cursor: default;
	}
`

// Pushed to the right edge (past the queue actions) so it sits beside the native
// window controls, matching where a maximize/restore button would be.
const fullscreenButtonStyles = css`
	${buttonStyles};
	align-items: center;
	display: inline-flex;
	margin-left: auto;
	padding: 5px 8px;
`

// Thin top hit-strip that reveals the auto-hidden bar on mouse hover; only
// mounted while the bar is hidden in fullscreen. Touch reveals via the edge
// swipe instead (see `useEdgeSwipe` below). Sits just under the bar's own
// z-index so the bar covers it once shown.
const hitStripStyles = css`
	height: 32px;
	left: 0;
	position: fixed;
	top: 0;
	touch-action: none;
	width: 100%;
	z-index: 9999;
`

// Faint pill hinting the bar can be pulled/hovered down; shown only while it's
// hidden so it never overlaps the revealed bar.
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

// A hair of separation between the load action and the two close actions.
const separatorStyles = css`
	background-color: #444;
	flex: 0 0 auto;
	height: 18px;
	width: 1px;
`

const TitleBar = () => {
  const { filePath } = useContext(FileSystemContext)

  const { imageFilePath } = useContext(ImageViewerContext)

  const {
    clearQueue,
    hasSavedQueue,
    loadQueue,
    queuedFolders,
    saveQueue,
  } = useContext(WorkspaceContext)

  const { isFullScreen, toggleFullScreen } = useContext(
    FullScreenContext,
  )

  // Only meaningful in fullscreen; windowed, the bar is always pinned open.
  const [isBarVisible, setIsBarVisible] = useState(true)

  const autoHideTimerRef = useRef()

  // The whole document is the drag-down summon surface, so the reveal works in
  // the file browser and the viewer alike. Set once — it exists at render.
  const rootRef = useRef(
    typeof document === "undefined"
      ? null
      : document.documentElement,
  )

  const scheduleAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    autoHideTimerRef.current = window.setTimeout(() => {
      setIsBarVisible(false)
    }, AUTO_HIDE_MS)
  }, [])

  const revealBar = useCallback(() => {
    setIsBarVisible(true)

    scheduleAutoHide()
  }, [scheduleAutoHide])

  const cancelAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)
  }, [])

  // Entering fullscreen flashes the bar so the exit control is discoverable,
  // then hides it; leaving pins it back open and cancels any pending hide.
  useEffect(() => {
    if (isFullScreen) {
      setIsBarVisible(true)

      scheduleAutoHide()
    } else {
      window.clearTimeout(autoHideTimerRef.current)

      setIsBarVisible(true)
    }

    return () => {
      window.clearTimeout(autoHideTimerRef.current)
    }
  }, [isFullScreen, scheduleAutoHide])

  // Touch summon (mirrors the viewer chrome): a downward drag from the top edge
  // reveals the hidden bar so fullscreen stays exitable without a keyboard. No-op
  // unless we're actually in fullscreen, so windowed drags are untouched.
  useEdgeSwipe({
    domElementRef: rootRef,
    edgeRatio: 0.3,
    onDismiss: () => {
      if (isFullScreen) {
        setIsBarVisible(false)
      }
    },
    onReveal: () => {
      if (isFullScreen) {
        revealBar()
      }
    },
  })

  // Mouse summon: real motion over the top hit-strip reveals the bar. Touch uses
  // the edge swipe above, never this.
  const onHitStripPointerMove = useCallback(
    (event) => {
      if (event.pointerType !== "mouse") {
        return
      }

      if (event.movementX === 0 && event.movementY === 0) {
        return
      }

      revealBar()
    },
    [revealBar],
  )

  useEffect(() => {
    const folderName = pathApi.basename(filePath)
    const parentPath = pathApi.dirname(filePath)

    const leadingText = imageFilePath
      ? pathApi.join(
          folderName,
          pathApi.basename(imageFilePath),
        )
      : folderName

    document.title = `${leadingText} | ${parentPath} | Image Viewer`
  }, [filePath, imageFilePath])

  const hasQueue = queuedFolders.length > 0

  // Only surface what's actionable: loading needs a saved slot; saving/closing
  // need an active queue. And "Close queue" (discard) only shows once a save
  // exists as a fallback — with nothing saved, "Save for later" is the sole way
  // out, so a live queue can't be thrown away by accident.
  const showLoad = hasSavedQueue
  const showSaveForLater = hasQueue
  const showClose = hasSavedQueue && hasQueue
  const showAnyAction =
    showLoad || showSaveForLater || showClose

  // "Save for later": snapshot the queue, then clear it once the write lands, so
  // the saved slot is guaranteed on disk before the live queue empties.
  const saveAndCloseQueue = useCallback(() => {
    saveQueue().then(clearQueue)
  }, [clearQueue, saveQueue])

  // Windowed: always shown, gutter reserved for the native controls. Fullscreen:
  // slides up when hidden and drops the gutter (the OS controls are gone).
  const isBarShown = !isFullScreen || isBarVisible

  const barStyles = useMemo(
    () => css`
			${titleBarStyles};
			padding-right: ${
        isFullScreen ? 10 : WINDOW_CONTROLS_WIDTH
      }px;
			transform: translateY(${isBarShown ? "0" : "-100%"});
			transition: transform 220ms ease;
		`,
    [isBarShown, isFullScreen],
  )

  return (
    <Fragment>
      {isFullScreen && !isBarVisible && (
        <div
          css={hitStripStyles}
          onPointerMove={onHitStripPointerMove}
        >
          <div css={grabHandleStyles} />
        </div>
      )}

      <div
        css={barStyles}
        onPointerEnter={
          isFullScreen ? cancelAutoHide : undefined
        }
        onPointerLeave={
          isFullScreen ? scheduleAutoHide : undefined
        }
      >
        <span css={appNameStyles}>Image Viewer</span>

        {showAnyAction && <div css={separatorStyles} />}

        {showLoad && (
          <button
            css={buttonStyles}
            onClick={loadQueue}
            title="Load the saved queue"
            type="button"
          >
            Load queue
          </button>
        )}

        {showSaveForLater && (
          <button
            css={buttonStyles}
            onClick={saveAndCloseQueue}
            title="Save the current queue for later, then close it"
            type="button"
          >
            Save for later
          </button>
        )}

        {showClose && (
          <button
            css={buttonStyles}
            onClick={clearQueue}
            title="Close the queue without saving"
            type="button"
          >
            Close queue
          </button>
        )}

        <button
          aria-label={
            isFullScreen
              ? "Exit fullscreen"
              : "Enter fullscreen"
          }
          css={fullscreenButtonStyles}
          onClick={toggleFullScreen}
          title={
            isFullScreen
              ? "Exit fullscreen (F11)"
              : "Enter fullscreen (F11)"
          }
          type="button"
        >
          {isFullScreen ? (
            <FullscreenExitIcon />
          ) : (
            <FullscreenIcon />
          )}
        </button>
      </div>
    </Fragment>
  )
}

export default TitleBar
