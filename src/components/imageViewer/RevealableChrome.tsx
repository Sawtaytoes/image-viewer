import { Tooltip } from "@charcuterie/ui"
import type {
  Dispatch,
  PointerEventHandler,
  RefObject,
  SetStateAction,
} from "react"
import {
  Fragment,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import AddIcon from "../icons/AddIcon"
import ArrowBackIcon from "../icons/ArrowBackIcon"
import NewWindowIcon from "../icons/NewWindowIcon"
import FolderTabStrip from "../workspace/FolderTabStrip"
import WorkspaceContext from "../workspace/WorkspaceContext"
import DisplayPickerPopover from "./DisplayPickerPopover"
import ImageViewerContext from "./ImageViewerContext"
import type { EdgeSwipePoint } from "./useEdgeSwipe"
import useEdgeSwipe from "./useEdgeSwipe"
import type { SpawnTapFeedback } from "./useTapFeedback"

const AUTO_HIDE_MS = 3000

// Thin top hit-strip that listens for the summon swipe even while the bar is
// hidden. Hovering it reveals the bar (the mouse has no implicit pointer
// capture, so the touch swipe alone leaves `+` unreachable with a mouse).
//
// `z-[1]` sits above plain column content but *below* a pane that's showing its
// gallery/menu (those elevate to `z-[2]`, see `Pane`), so the gallery's own top
// controls — the up-a-folder button especially — stay tappable instead of being
// swallowed by this strip's hover-to-reveal.
//
// It sits below the fixed custom title bar (`top-(--title-bar-height)`) so
// hover-to-reveal isn't swallowed by it. Tailwind cannot interpolate the
// `TITLE_BAR_HEIGHT` constant Emotion used, so the number lives in the custom
// property; `titleBarHeight.test.ts` fails if the two drift.
const HIT_STRIP_CLASSES =
  "fixed left-0 top-(--title-bar-height) z-[1] h-8 w-full touch-none"

// Sits just under the fixed custom title bar rather than behind it.
const CHROME_BAR_CLASSES =
  "fixed left-0 top-(--title-bar-height) z-[3] flex w-full items-center gap-2 bg-surface-overlay px-2 py-1.5 touch-none transition-transform duration-[220ms] ease-[ease]"

const CHROME_BUTTON_CLASSES =
  "inline-flex flex-none cursor-pointer items-center gap-1 rounded-[5px] border-0 bg-transparent px-2.5 py-1.5 text-[16px] font-light text-content-primary hover:bg-intent-neutral-surface-hover"

interface RevealableChromeProps {
  // Chrome visibility lives in `ImageViewer` so the active column can outline
  // itself while the bar is up; this component owns every transition of it.
  isVisible: boolean
  setIsVisible: Dispatch<SetStateAction<boolean>>
  spawn: (request: SpawnTapFeedback) => void
  // The full-viewer element the drag-down-to-reveal gesture listens on, so the
  // swipe can start anywhere in the top portion of the screen, not just the
  // thin top strip.
  viewerRef: RefObject<HTMLDivElement | null>
}

const RevealableChrome = ({
  isVisible,
  setIsVisible,
  spawn,
  viewerRef,
}: RevealableChromeProps) => {
  const {
    addPaneAndFill,
    clearPanes,
    isChromeRevealSuppressed,
    suppressChromeReveal,
  } = useContext(WorkspaceContext)

  const { leaveImageViewer } = useContext(
    ImageViewerContext,
  )

  const [isDisplayMenuOpen, setIsDisplayMenuOpen] =
    useState(false)

  const autoHideTimerRef = useRef<number | undefined>(
    undefined,
  )
  const hitStripRef = useRef<HTMLDivElement>(null)

  const scheduleAutoHide = useCallback(() => {
    window.clearTimeout(autoHideTimerRef.current)

    autoHideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false)
    }, AUTO_HIDE_MS)
  }, [setIsVisible])

  const reveal = useCallback(
    (point?: EdgeSwipePoint) => {
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
  const onHitStripPointerMove = useCallback<
    PointerEventHandler<HTMLDivElement>
  >(
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
    (point: EdgeSwipePoint) => {
      reveal(point)
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

  const openDisplayMenu = useCallback(() => {
    // Keep the bar up while the menu is open (the fullscreen overlay sits above
    // it anyway) so it's still there when the menu closes.
    window.clearTimeout(autoHideTimerRef.current)

    setIsDisplayMenuOpen(true)
  }, [])

  const closeDisplayMenu = useCallback(() => {
    setIsDisplayMenuOpen(false)

    // Same hover-reveal suppression the pane menus use: closing the overlay from
    // under a stationary cursor would otherwise re-pop the bar.
    suppressChromeReveal()

    scheduleAutoHide()
  }, [scheduleAutoHide, suppressChromeReveal])

  return (
    <Fragment>
      <div
        className={HIT_STRIP_CLASSES}
        onPointerMove={onHitStripPointerMove}
        ref={hitStripRef}
      >
        {!isVisible && (
          // Faint pill hinting the bar can be pulled/hovered down; only shown
          // while the bar is hidden so it doesn't sit on top of the revealed
          // chrome. Sized up so it's an obvious grab target for the
          // drag-down-to-reveal gesture
          // (`docs/decisions/2026-06-30-queue-is-summonable-by-touch.md`).
          <div className="absolute top-2 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-[3px] bg-border-strong" />
        )}
      </div>

      {/* The bar slides out of view rather than unmounting, and the transform is
          one of two static classes — a `translate-y-[${…}]` built at runtime is
          text Tailwind never scans, so the bar would simply never move. */}
      <div
        className={`${CHROME_BAR_CLASSES} ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        onPointerDown={scheduleAutoHide}
        onPointerEnter={cancelAutoHide}
        onPointerLeave={scheduleAutoHide}
      >
        <button
          className={CHROME_BUTTON_CLASSES}
          onClick={goToFolders}
          type="button"
        >
          <ArrowBackIcon />
          Folders
        </button>

        <div className="min-w-0 flex-auto">
          <FolderTabStrip />
        </div>

        <button
          aria-label="Add column"
          className={CHROME_BUTTON_CLASSES}
          onClick={onAddPane}
          type="button"
        >
          <AddIcon />
        </button>

        {/* The one control in this bar whose icon does not explain itself — a
            "new window" glyph says nothing about *which display*. It was a
            native `title`, so on touch (this app's primary input) the
            explanation never appeared at all. */}
        <Tooltip label="Open a new window on another display">
          <button
            aria-label="Spawn window on another display"
            className={CHROME_BUTTON_CLASSES}
            onClick={openDisplayMenu}
            type="button"
          >
            <NewWindowIcon />
          </button>
        </Tooltip>
      </div>

      {isDisplayMenuOpen && (
        <DisplayPickerPopover onClose={closeDisplayMenu} />
      )}
    </Fragment>
  )
}

const MemoizedRevealableChrome = memo(RevealableChrome)

export default MemoizedRevealableChrome
