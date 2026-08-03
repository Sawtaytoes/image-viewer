import { Tooltip } from "@charcuterie/ui"
import type { CSSProperties } from "react"
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
import ColorSchemeControl from "./ColorSchemeControl"
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

// Mouse-only: moving the cursor within this many pixels of the top edge summons
// the hidden bar in fullscreen. Matches the old hit-strip height so the reveal
// zone is unchanged — only the mechanism (a document `pointermove` listener,
// not a covering element) differs, so the reveal no longer eats taps meant for
// the controls beneath it.
const REVEAL_EDGE_PX = 32

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
  "flex-none text-sm font-semibold whitespace-nowrap text-content-secondary"

// Everything the two kinds of button share EXCEPT the horizontal padding, which
// differs between them. Two `px-*` utilities on one element would be resolved by
// their order in the generated stylesheet rather than in the `class` attribute,
// so the shared part deliberately sets no `px` at all and each button adds its
// own. `enabled:` is `:enabled`, which is what the old `:not(:disabled)` meant.
const buttonBaseClassName =
  "[-webkit-app-region:no-drag] flex-none cursor-pointer rounded-[5px] border-0 bg-transparent py-[5px] text-sm font-normal whitespace-nowrap text-content-primary enabled:hover:bg-intent-neutral-surface-hover enabled:active:bg-intent-neutral-solid-hover disabled:cursor-default disabled:text-content-disabled"

const buttonClassName = `${buttonBaseClassName} px-[10px]`

// Pushed to the right edge (past the queue actions) so it sits beside the native
// window controls, matching where a maximize/restore button would be.
const fullscreenButtonClassName = `${buttonBaseClassName} ml-auto inline-flex items-center px-2`

// Purely-visual grab-handle wrapper: `pointer-events-none` so it can NEVER
// intercept a tap meant for a control beneath it. The old interactive hit-strip
// sat at `z-[9999]` over the top 32px and swallowed taps on the directory
// controls in fullscreen — reintroducing the exact "up-arrow brings down the
// pull-down menu instead of going up a folder" regression that
// `docs/decisions/2026-06-04-up-arrow-navigates-up-not-dropdown.md` locked out.
// Touch reveals via the edge swipe below; the mouse reveals via a
// document-level `pointermove` listener (see the effect below). Neither needs a
// covering element, so nothing blocks the controls. Only shown while the bar is
// hidden in fullscreen.
const grabHandleWrapperClassName =
  "pointer-events-none fixed top-0 left-0 z-[9999] h-8 w-full"

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
    panes,
    queuedFolders,
    saveQueue,
  } = useContext(WorkspaceContext)

  const { isFullScreen, toggleFullScreen } = useContext(
    FullScreenContext,
  )

  // In fullscreen with the viewer open, the viewer's own `RevealableChrome` is
  // the single summonable bar — it re-anchors to the very top and carries the
  // fullscreen-exit control. The title bar stands down entirely there, so one
  // pull-down summons ONE bar instead of two stacked ones (the "two pull-down
  // menus" bug). Same open test the viewer itself uses (`ImageViewer.isOpen`).
  const isViewerOpen =
    panes.length > 0 || Boolean(imageFilePath)

  const isTitleBarActive = !(isFullScreen && isViewerOpen)

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
      if (isFullScreen && isTitleBarActive) {
        setIsBarVisible(false)
      }
    },
    onReveal: () => {
      if (isFullScreen && isTitleBarActive) {
        revealBar()
      }
    },
  })

  // Mouse summon without a covering element: while the bar is hidden in
  // fullscreen (and it is the active bar), a real cursor move into the top edge
  // reveals it. Listening on `document` rather than a `z-[9999]` strip is what
  // lets a click on the directory controls at the very top reach them instead of
  // being intercepted. Touch uses the edge swipe above, never this.
  useEffect(() => {
    if (
      !isFullScreen ||
      !isTitleBarActive ||
      isBarVisible
    ) {
      return undefined
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return
      }

      if (event.movementX === 0 && event.movementY === 0) {
        return
      }

      if (event.clientY > REVEAL_EDGE_PX) {
        return
      }

      revealBar()
    }

    document.addEventListener("pointermove", onPointerMove)

    return () => {
      document.removeEventListener(
        "pointermove",
        onPointerMove,
      )
    }
  }, [
    isBarVisible,
    isFullScreen,
    isTitleBarActive,
    revealBar,
  ])

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
  // slides up when hidden and drops the gutter (the OS controls are gone). When
  // the viewer is open in fullscreen the bar stays fully put away — the viewer
  // chrome is the single bar there.
  const isBarShown =
    !isFullScreen || (isTitleBarActive && isBarVisible)

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
      {isFullScreen &&
        isTitleBarActive &&
        !isBarVisible && (
          <div className={grabHandleWrapperClassName}>
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

        {/* Four native `title`s become four `Tooltip`s. The three queue actions
            keep their visible text as the accessible name and the tip explains
            the consequence — "Save for later" says nothing about *closing* the
            queue, which is the half that surprises people.

            A `title` never appears on a touch device at all, and this bar is
            reachable by a drag-down gesture on the Surface
            (`docs/decisions/2026-06-30-queue-is-summonable-by-touch.md`), so on
            the app's primary input every one of these explanations was dead
            text. `Tooltip` also opens on focus, which `title` does not. */}
        {isLoadShown && (
          <Tooltip label="Load the saved queue">
            <button
              className={buttonClassName}
              onClick={loadQueue}
              type="button"
            >
              Load queue
            </button>
          </Tooltip>
        )}

        {isSaveForLaterShown && (
          <Tooltip label="Save the current queue for later, then close it">
            <button
              className={buttonClassName}
              onClick={saveAndCloseQueue}
              type="button"
            >
              Save for later
            </button>
          </Tooltip>
        )}

        {isCloseShown && (
          <Tooltip label="Close the queue without saving">
            <button
              className={buttonClassName}
              onClick={clearQueue}
              type="button"
            >
              Close queue
            </button>
          </Tooltip>
        )}

        {/* Follow-the-OS colour scheme, cycling light → dark → system. Placed
            here, at the start of the right-aligned cluster (it carries the
            `ml-auto`), so it sits beside the fullscreen control rather than in the
            left group with the app name and queue actions. */}
        <ColorSchemeControl />

        {/* The `aria-label` stays and the tip is deliberately *not* the same
            string: `useRole(context, { role: "tooltip" })` points
            `aria-describedby` at the tip, so the name stays "Exit fullscreen"
            and the shortcut rides along as the description rather than being
            read as part of the button's name. */}
        <Tooltip
          label={
            isFullScreen
              ? "Exit fullscreen (F11)"
              : "Enter fullscreen (F11)"
          }
        >
          <button
            aria-label={
              isFullScreen
                ? "Exit fullscreen"
                : "Enter fullscreen"
            }
            className={fullscreenButtonClassName}
            onClick={toggleFullScreen}
            type="button"
          >
            {isFullScreen ? (
              <FullscreenExitIcon />
            ) : (
              <FullscreenIcon />
            )}
          </button>
        </Tooltip>
      </div>
    </Fragment>
  )
}

export default TitleBar
