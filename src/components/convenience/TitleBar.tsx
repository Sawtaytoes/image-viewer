import { Tooltip } from "@charcuterie/ui"
import type { CSSProperties } from "react"
import { useCallback, useContext, useEffect } from "react"

import FileSystemContext from "../fileBrowser/FileSystemContext"
import FullscreenExitIcon from "../icons/FullscreenExitIcon"
import FullscreenIcon from "../icons/FullscreenIcon"
import ImageViewerContext from "../imageViewer/ImageViewerContext"
import WorkspaceContext from "../workspace/WorkspaceContext"
import ColorSchemeControl from "./ColorSchemeControl"
import FullScreenContext from "./FullScreenContext"

const pathApi = window.api.path

// Reserve room on the right for the native window controls the `titleBarOverlay`
// paints there (Windows/macOS) so the fullscreen button can hug them without
// sitting underneath. In fullscreen the OS hides those controls, so the button
// reclaims the space (see `barStyle` below).
const WINDOW_CONTROLS_WIDTH = 140

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
//
// `transition-transform` animates the one transition the bar still makes: sliding
// up out of view when it stands down for the fullscreen viewer (see `barStyle`).
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

// Sits at the right end of the cluster, beside the native window controls,
// matching where a maximize/restore button would be. The `ml-auto` that starts
// the right-aligned cluster lives on `ColorSchemeControl` (the first item in the
// cluster); a second `ml-auto` here would split the free space between the two
// and float the colour-scheme toggle into the middle of the bar, so this button
// takes no auto margin and simply follows the toggle.
const fullscreenButtonClassName = `${buttonBaseClassName} inline-flex items-center px-2`

// A hair of separation between the load action and the two close actions.
const separatorClassName =
  "h-[18px] w-px flex-none bg-border-default"

const TitleBar = () => {
  const { filePath } = useContext(FileSystemContext)

  const { imageFilePath } = useContext(ImageViewerContext)

  const {
    clearQueue,
    clearSavedQueue,
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

  // The bar is pinned open in every state EXCEPT fullscreen with the viewer
  // open, where it slides up and stands down for the viewer chrome
  // (2026-08-03 decision). There is no fullscreen auto-hide anymore: in the
  // fullscreen file browser the bar stays pinned and the browser insets its
  // content below it, so the bar never covers the directory controls
  // (2026-08-05 decision — "pin the bar, push the content down").
  const isTitleBarActive = !(isFullScreen && isViewerOpen)

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
  // "Delete saved" discards the saved *slot* (not the live queue), so it's the
  // one action that needs a saved slot but not a live queue — the way to reset a
  // stale save without loading it first.
  const isDeleteSavedShown = hasSavedQueue
  const isAnyActionShown =
    isLoadShown ||
    isSaveForLaterShown ||
    isCloseShown ||
    isDeleteSavedShown

  // "Save for later": snapshot the queue, then clear it once the write lands, so
  // the saved slot is guaranteed on disk before the live queue empties.
  const saveAndCloseQueue = useCallback(() => {
    saveQueue().then(clearQueue)
  }, [clearQueue, saveQueue])

  // Pinned open (windowed and the fullscreen file browser), with the right
  // gutter reserved for the native window controls only where they exist — the
  // OS hides them in fullscreen, so the button reclaims that space. Standing
  // down (fullscreen + viewer open) slides the whole bar up out of view.
  //
  // Both values are computed at render, which is precisely what a Tailwind class
  // cannot carry: `pr-[${…}px]` is scanned as source text and would generate no
  // CSS at all. So the right padding and the slide are an inline `style` — which
  // also resolves cleanly, since an element's own `style` beats any utility. The
  // `transition-transform` that animates the slide is a class, because the
  // transition itself never changes.
  const barStyle: CSSProperties = {
    paddingRight: isFullScreen ? 10 : WINDOW_CONTROLS_WIDTH,
    transform: isTitleBarActive
      ? "translateY(0)"
      : "translateY(-100%)",
  }

  return (
    <div className={titleBarClassName} style={barStyle}>
      <span className={appNameClassName}>Image Viewer</span>

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

      {isDeleteSavedShown && (
        <Tooltip label="Delete the saved queue so it can't be loaded again">
          <button
            className={buttonClassName}
            onClick={clearSavedQueue}
            type="button"
          >
            Delete saved
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
  )
}

export default TitleBar
