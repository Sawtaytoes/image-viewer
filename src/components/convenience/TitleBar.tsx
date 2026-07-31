import type { CSSProperties, PointerEvent } from "react"
import {
  Fragment,
  useCallback,
  useContext,
  useEffect,
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

const pathApi = window.api.path

// Reserve room on the right for the native window controls the `titleBarOverlay`
// paints there (Windows/macOS) so the fullscreen button can hug them without
// sitting underneath. In fullscreen the OS hides those controls, so the button
// reclaims the space (see `barStyle` below).
const WINDOW_CONTROLS_WIDTH = 140

// Brief window of visibility after entering fullscreen before the bar hides
// itself — long enough to notice the exit control, matching the viewer chrome.
const AUTO_HIDE_MS = 3000

// The whole strip is a drag handle (`-webkit-app-region: drag`) so the frameless
// window can still be moved; interactive children opt back out with `no-drag`.
// The right edge is left as empty drag space for the native window controls that
// `titleBarOverlay` paints there (Windows/macOS), so nothing sits under them.
//
// `-webkit-app-region` is Electron's property, not CSS's, and Tailwind has no
// utility for it — so it is the arbitrary property `[-webkit-app-region:drag]`
// everywhere in this file, rather than an inline style on some elements and a
// class on others. It stays with the rest of the element's styling that way, and
// the pair (`drag` on the strip, `no-drag` on every control) reads as a pair.
//
// The height is `h-(--title-bar-height)`, NOT `h-[40px]`: Emotion interpolated
// the `TITLE_BAR_HEIGHT` constant into the template literal and Tailwind cannot
// interpolate anything, so the number lives in `src/styles/tailwind.css` as a
// custom property. `titleBarHeight.test.ts` fails if the constant, the variable
// and `main.js`'s `titleBarOverlay.height` ever disagree — hardcoding the pixels
// here is exactly what that test exists to catch.
const titleBarClassName =
  "[-webkit-app-region:drag] fixed top-0 right-0 left-0 z-[10000] flex h-(--title-bar-height) items-center gap-1.5 bg-surface-sunken px-[10px] text-content-primary select-none transition-transform duration-[220ms] ease-[ease]"

const appNameClassName =
  "flex-none text-[13px] font-semibold whitespace-nowrap text-content-secondary"

// Everything the two kinds of button share EXCEPT the horizontal padding, which
// differs between them. Two `px-*` utilities on one element would be resolved by
// their order in the generated stylesheet rather than in the `class` attribute,
// so the shared part deliberately sets no `px` at all and each button adds its
// own. `enabled:` is `:enabled`, which is what the old `:not(:disabled)` meant.
const buttonBaseClassName =
  "[-webkit-app-region:no-drag] flex-none cursor-pointer rounded-[5px] border-0 bg-transparent py-[5px] text-[13px] font-normal whitespace-nowrap text-content-primary enabled:hover:bg-intent-neutral-surface-hover enabled:active:bg-intent-neutral-solid-hover disabled:cursor-default disabled:text-content-disabled"

const buttonClassName = `${buttonBaseClassName} px-[10px]`

// Pushed to the right edge (past the queue actions) so it sits beside the native
// window controls, matching where a maximize/restore button would be.
const fullscreenButtonClassName = `${buttonBaseClassName} ml-auto inline-flex items-center px-2`

// Thin top hit-strip that reveals the auto-hidden bar on mouse hover; only
// mounted while the bar is hidden in fullscreen. Touch reveals via the edge
// swipe instead (see `useEdgeSwipe` below). Sits just under the bar's own
// z-index so the bar covers it once shown.
const hitStripClassName =
  "fixed top-0 left-0 z-[9999] h-8 w-full touch-none"

// Faint pill hinting the bar can be pulled/hovered down; shown only while it's
// hidden so it never overlaps the revealed bar.
const grabHandleClassName =
  "absolute top-2 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-[3px] bg-intent-neutral-surface-hover"

// A hair of separation between the load action and the two close actions.
const separatorClassName =
  "h-[18px] w-px flex-none bg-border-default"

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

  const autoHideTimerRef = useRef<number | undefined>(
    undefined,
  )

  // The whole document is the drag-down summon surface, so the reveal works in
  // the file browser and the viewer alike. Set once — it exists at render.
  const rootRef = useRef<HTMLElement | null>(
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
    (event: PointerEvent<HTMLDivElement>) => {
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
  //
  // Renamed from `showLoad` / `showSaveForLater` / `showClose` / `showAnyAction`:
  // the is/has boolean rule is type-driven and runs only on `.ts`/`.tsx`, so the
  // conversion is the first thing to see these.
  const isLoadShown = hasSavedQueue
  const isSaveForLaterShown = hasQueue
  const isCloseShown = hasSavedQueue && hasQueue
  const isAnyActionShown =
    isLoadShown || isSaveForLaterShown || isCloseShown

  // "Save for later": snapshot the queue, then clear it once the write lands, so
  // the saved slot is guaranteed on disk before the live queue empties.
  const saveAndCloseQueue = useCallback(() => {
    saveQueue().then(clearQueue)
  }, [clearQueue, saveQueue])

  // Windowed: always shown, gutter reserved for the native controls. Fullscreen:
  // slides up when hidden and drops the gutter (the OS controls are gone).
  const isBarShown = !isFullScreen || isBarVisible

  // Both values are computed at render, which is precisely what a Tailwind class
  // cannot carry: `pr-[${…}px]` is scanned as source text and would generate no
  // CSS at all. So the right padding and the slide are an inline `style` — which
  // also resolves cleanly, since an element's own `style` beats any utility.
  // The `transition-transform` that animates it is a class, because the
  // transition itself never changes.
  const barStyle: CSSProperties = {
    paddingRight: isFullScreen ? 10 : WINDOW_CONTROLS_WIDTH,
    transform: isBarShown
      ? "translateY(0)"
      : "translateY(-100%)",
  }

  return (
    <Fragment>
      {isFullScreen && !isBarVisible && (
        <div
          className={hitStripClassName}
          onPointerMove={onHitStripPointerMove}
        >
          <div className={grabHandleClassName} />
        </div>
      )}

      <div
        className={titleBarClassName}
        onPointerEnter={
          isFullScreen ? cancelAutoHide : undefined
        }
        onPointerLeave={
          isFullScreen ? scheduleAutoHide : undefined
        }
        style={barStyle}
      >
        <span className={appNameClassName}>
          Image Viewer
        </span>

        {isAnyActionShown && (
          <div className={separatorClassName} />
        )}

        {isLoadShown && (
          <button
            className={buttonClassName}
            onClick={loadQueue}
            title="Load the saved queue"
            type="button"
          >
            Load queue
          </button>
        )}

        {isSaveForLaterShown && (
          <button
            className={buttonClassName}
            onClick={saveAndCloseQueue}
            title="Save the current queue for later, then close it"
            type="button"
          >
            Save for later
          </button>
        )}

        {isCloseShown && (
          <button
            className={buttonClassName}
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
          className={fullscreenButtonClassName}
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
