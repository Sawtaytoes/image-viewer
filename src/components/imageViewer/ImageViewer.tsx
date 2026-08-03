import { memo, useContext, useRef, useState } from "react"

import FullScreenContext from "../convenience/FullScreenContext"
import WorkspaceContext from "../workspace/WorkspaceContext"
import ImageViewerContext from "./ImageViewerContext"
import LegacyImageColumn from "./LegacyImageColumn"
import Pane from "./Pane"
import RevealableChrome from "./RevealableChrome"
import TapFeedback from "./TapFeedback"
import useTapFeedback from "./useTapFeedback"

// `animate-viewer-in` fades the immersive viewer in on open so the jump from
// gallery to columns reads as a transition rather than an instant cut.
//
// The title bar's height is `--title-bar-height` here rather than the
// `TITLE_BAR_HEIGHT` constant Emotion used to interpolate: Tailwind scans source
// text and cannot read a JavaScript value, so the number lives in the custom
// property (`src/styles/tailwind.css`) and the constant stays for the arithmetic
// elsewhere. `titleBarHeight.test.ts` fails if the two drift.
const VIEWER_CLASSES =
  "fixed left-0 w-full overflow-hidden bg-surface-raised animate-viewer-in select-none"

// Fills the window below the fixed custom title bar.
const INSET_VIEWER_CLASSES =
  "top-(--title-bar-height) h-[calc(100%_-_var(--title-bar-height))]"

// Fullscreen auto-hides the title bar, so the viewer reclaims that top strip to
// fill the screen. The bar reveals as an overlay on top rather than pushing this
// back down, so there's no reflow on every summon.
const FULL_BLEED_VIEWER_CLASSES = "top-0 h-full"

const ImageViewer = () => {
  const { imageFilePath } = useContext(ImageViewerContext)

  const { activePaneId, panes } = useContext(
    WorkspaceContext,
  )

  const { isFullScreen } = useContext(FullScreenContext)

  const { feedback, remove, spawn } = useTapFeedback()

  // Lifted out of RevealableChrome so the active column can outline itself only
  // while the queue bar is showing (the bar manages every transition; this is
  // just the shared source of truth). The viewer root is the swipe surface for
  // the drag-down-to-reveal gesture.
  const [isChromeVisible, setIsChromeVisible] =
    useState(true)

  const viewerRef = useRef<HTMLDivElement>(null)

  const isOpen = panes.length > 0 || Boolean(imageFilePath)

  if (!isOpen) {
    return null
  }

  // Columns-only once any column exists: the legacy single-image view only
  // shows when there are no panes, so it can never appear as a stray extra
  // column beside them.
  const hasLegacyColumn =
    panes.length === 0 && Boolean(imageFilePath)

  return (
    <div
      className={`${VIEWER_CLASSES} ${
        isFullScreen
          ? FULL_BLEED_VIEWER_CLASSES
          : INSET_VIEWER_CLASSES
      }`}
      ref={viewerRef}
    >
      {/* `gap-0.5` (2px) lets the dark viewer background show through as a
          hairline separator between columns — a subtle divider with negligible
          width loss. */}
      <div className="flex h-full w-full flex-row gap-0.5">
        {hasLegacyColumn && (
          <LegacyImageColumn
            isActive
            isChromeRevealed={isChromeVisible}
            spawn={spawn}
          />
        )}

        {panes.map((pane) => (
          <Pane
            isActive={pane.id === activePaneId}
            isChromeRevealed={isChromeVisible}
            key={pane.id}
            pane={pane}
            spawn={spawn}
          />
        ))}
      </div>

      <RevealableChrome
        isVisible={isChromeVisible}
        setIsVisible={setIsChromeVisible}
        spawn={spawn}
        viewerRef={viewerRef}
      />

      <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
        {feedback.map((item) => (
          <TapFeedback
            key={item.id}
            onDone={() => {
              remove(item.id)
            }}
            variant={item.variant}
            x={item.x}
            y={item.y}
          />
        ))}
      </div>
    </div>
  )
}

const MemoizedImageViewer = memo(ImageViewer)

export default MemoizedImageViewer
