import type { MouseEventHandler } from "react"
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import FillRing from "../fileBrowser/FillRing"
import Image from "./Image"
import type { TapPoint } from "./TapFeedback"
import type { LongPressEvent } from "./useLongPress"
import useLongPress from "./useLongPress"
import usePointerHover from "./usePointerHover"
import useWheelNavigation from "./useWheelNavigation"

// The two 30% nav zones. Only ONE of the opacity utilities and only ONE of the
// background utilities may be on the element at a time: Tailwind resolves
// competing utilities by the order they appear in the generated stylesheet, not
// by the order they appear in `className`, so listing both and hoping the later
// one wins is the way this reads correct and renders wrong.
//
// `focus:`/`active:` stay pinned at 0 the way the Emotion rule did — those
// selectors outrank the plain opacity, so a lit edge still goes dark while
// pressed.
const NAVIGATION_ZONE_CLASSES =
  "absolute top-0 h-full w-[30%] focus:opacity-0 active:opacity-0"

interface ImageViewProps {
  goToNextImage: () => void
  goToPreviousImage: () => void
  imageFileName: string
  imageFilePath: string
  isAtBeginning: boolean
  isAtEnd: boolean
  // Optional: a press-and-hold on the center zone (vs. a quick tap, which fires
  // `onCenterTap`). When omitted, a hold does nothing special and still ends as
  // a tap on release (the legacy single-image column has no hold action).
  onCenterHold?: (point: TapPoint) => void
  onCenterTap: (point: TapPoint) => void
}

const ImageView = ({
  goToNextImage,
  goToPreviousImage,
  imageFileName,
  imageFilePath,
  isAtBeginning,
  isAtEnd,
  onCenterHold,
  onCenterTap,
}: ImageViewProps) => {
  const [isHoveringNextOverlay, setIsHoveringNextOverlay] =
    useState(false)

  const [
    isHoveringPreviousOverlay,
    setIsHoveringPreviousOverlay,
  ] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const navigateNextOverlayRef =
    useRef<HTMLDivElement>(null)
  const navigatePreviousOverlayRef =
    useRef<HTMLDivElement>(null)
  const centerZoneRef = useRef<HTMLDivElement>(null)

  // A completed hold opens the menu mid-gesture; swallow the trailing `click`
  // (fired on release) so it doesn't also fire the tap action.
  const suppressNextCenterClickRef = useRef(false)

  const [centerHoldProgress, setCenterHoldProgress] =
    useState(0)

  // Belt-and-suspenders for the "stuck edge" bug: if the window loses focus
  // while a nav edge is lit, no `pointerleave` reaches the overlay, so force
  // both hover flags off here too. `usePointerHover` also clears on blur — this
  // guarantees the painted state resets even if an overlay's listener missed it.
  useEffect(() => {
    const onWindowBlur = () => {
      setIsHoveringNextOverlay(false)
      setIsHoveringPreviousOverlay(false)
    }

    window.addEventListener("blur", onWindowBlur)

    return () => {
      window.removeEventListener("blur", onWindowBlur)
    }
  }, [])

  usePointerHover({
    callback: ({ isHovering }) => {
      setIsHoveringNextOverlay(isHovering)
    },
    domElementRef: navigateNextOverlayRef,
  })

  usePointerHover({
    callback: ({ isHovering }) => {
      setIsHoveringPreviousOverlay(isHovering)
    },
    domElementRef: navigatePreviousOverlayRef,
  })

  // Fire on `click`, not `pointerdown`: this tap usually changes what's
  // rendered (closes the viewer, or opens the per-column menu). On
  // `pointerdown` the viewer would unmount mid-tap and the trailing
  // `pointerup`/`click` would fall through to the gallery thumbnail behind it
  // (the "double-tap to gallery then opens an image" bug). A `click` is
  // delivered to this zone as one unit, and React only re-renders afterward.
  const onCenterClick = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(
    (event) => {
      event.stopPropagation()

      if (suppressNextCenterClickRef.current) {
        suppressNextCenterClickRef.current = false

        return
      }

      onCenterTap({ x: event.clientX, y: event.clientY })
    },
    [onCenterTap],
  )

  const onCenterHoldProgress = useCallback(
    (fraction: number) => {
      setCenterHoldProgress(fraction)
    },
    [],
  )

  const onCenterHoldComplete = useCallback(
    ({ event }: LongPressEvent) => {
      setCenterHoldProgress(0)

      // No hold action (legacy column): let the release fall through as a tap.
      if (!onCenterHold) {
        return
      }

      suppressNextCenterClickRef.current = true

      onCenterHold({ x: event.clientX, y: event.clientY })
    },
    [onCenterHold],
  )

  const onCenterHoldCancel = useCallback(() => {
    setCenterHoldProgress(0)
  }, [])

  useLongPress({
    domElementRef: centerZoneRef,
    onCancel: onCenterHoldCancel,
    onComplete: onCenterHoldComplete,
    onProgress: onCenterHoldProgress,
  })

  // Wheel ("middle mouse") up/down steps the image like the left/right zones.
  useWheelNavigation({
    domElementRef: rootRef,
    goToNextImage,
    goToPreviousImage,
  })

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      ref={rootRef}
    >
      <div className="absolute flex h-full w-full items-center justify-center">
        <Image
          fileName={imageFileName}
          filePath={imageFilePath}
        />
      </div>

      {/* Bounded close zone sitting between the two 30% nav zones, so edge taps
          navigate and only a center tap closes. */}
      <div
        className="absolute top-0 right-[30%] bottom-0 left-[30%]"
        onClick={onCenterClick}
        ref={centerZoneRef}
      >
        {centerHoldProgress > 0 && (
          <FillRing progress={centerHoldProgress} />
        )}
      </div>

      <div
        className={`${NAVIGATION_ZONE_CLASSES} right-0 ${
          isAtEnd
            ? "bg-intent-danger-solid"
            : "bg-content-primary"
        } ${
          isHoveringNextOverlay
            ? "opacity-[0.15]"
            : "opacity-0"
        }`}
        onPointerDown={goToNextImage}
        ref={navigateNextOverlayRef}
      />

      <div
        className={`${NAVIGATION_ZONE_CLASSES} left-0 ${
          isAtBeginning
            ? "bg-intent-danger-solid"
            : "bg-content-primary"
        } ${
          isHoveringPreviousOverlay
            ? "opacity-[0.15]"
            : "opacity-0"
        }`}
        onPointerDown={goToPreviousImage}
        ref={navigatePreviousOverlayRef}
      />
    </div>
  )
}

const MemoizedImageView = memo(ImageView)

export default MemoizedImageView
