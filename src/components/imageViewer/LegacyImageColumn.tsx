import { memo, useCallback, useContext } from "react"

import ImageView from "./ImageView"
import ImageViewerContext from "./ImageViewerContext"
import type { TapPoint } from "./TapFeedback"
import useImageNavigation from "./useImageNavigation"
import type { SpawnTapFeedback } from "./useTapFeedback"
import useViewerKeyboard from "./useViewerKeyboard"

// Its own file rather than a second component beside `ImageViewer`:
// `react/no-multi-comp` runs on `.tsx` and one component per file is the rule
// the conversion adopted (`docs/typescript-and-tailwind-conventions.md`).
const COLUMN_CLASSES =
  "relative h-full min-w-0 flex-1 touch-none"

// Same accent inset ring the panes use, applied only while the queue bar is
// revealed (see `Pane`'s active-pane classes).
const ACTIVE_COLUMN_CLASSES =
  "shadow-[inset_0_0_0_3px_var(--color-intent-accent-solid)]"

interface LegacyImageColumnProps {
  isActive: boolean
  isChromeRevealed: boolean
  spawn: (request: SpawnTapFeedback) => void
}

// The pre-columns single-image entry path (`imageFilePath` set), rendered as
// one column alongside any panes. Its center-tap still closes (`leaveImageViewer`)
// — unlike a pane, there's no folder to swap, so the "control this column" menu
// would only offer close anyway.
const LegacyImageColumn = ({
  isActive,
  isChromeRevealed,
  spawn,
}: LegacyImageColumnProps) => {
  const { imageFileName, imageFilePath, leaveImageViewer } =
    useContext(ImageViewerContext)

  const {
    goToNextImage,
    goToPreviousImage,
    isAtBeginning,
    isAtEnd,
  } = useImageNavigation()

  const close = useCallback(
    (point?: TapPoint) => {
      if (point) {
        spawn({
          variant: "close",
          x: point.x,
          y: point.y,
        })
      }

      leaveImageViewer()
    },
    [leaveImageViewer, spawn],
  )

  // Only the active column owns the keyboard, so arrows don't drive a column
  // the user isn't looking at. The viewer deletes folders, not single images,
  // so there's no `[Delete]` action on the legacy single-image column either.
  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled: isActive,
    onClose: close,
  })

  return (
    <div
      className={`${COLUMN_CLASSES}${
        isActive && isChromeRevealed
          ? ` ${ACTIVE_COLUMN_CLASSES}`
          : ""
      }`}
    >
      {/* `ImageViewer` only mounts this column once `imageFilePath` is set, so
          the guard is the compiler's, not a state the user can reach: the
          context types both members as possibly-undefined because the viewer is
          closed most of the time. */}
      {imageFileName !== undefined &&
        imageFilePath !== undefined && (
          <ImageView
            goToNextImage={goToNextImage}
            goToPreviousImage={goToPreviousImage}
            imageFileName={imageFileName}
            imageFilePath={imageFilePath}
            isAtBeginning={isAtBeginning}
            isAtEnd={isAtEnd}
            onCenterTap={close}
          />
        )}
    </div>
  )
}

const MemoizedLegacyImageColumn = memo(LegacyImageColumn)

export default MemoizedLegacyImageColumn
