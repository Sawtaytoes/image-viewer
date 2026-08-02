import {
  memo,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import useKeyboardControls from "../convenience/useKeyboardControls"
import Image from "../imageViewer/Image"
import useLongPress from "../imageViewer/useLongPress"
import FileSystemContext from "./FileSystemContext"
import FillRing from "./FillRing"
import MultiSelectContext from "./MultiSelectContext"
import useFolderImageCount from "./useFolderImageCount"
import useFolderThumbnail from "./useFolderThumbnail"
import useInView from "./useInView"

// `touch-pan-y` keeps the list scrollable on touch — `useLongPress` cancels
// itself on movement, so `touch-action: none` isn't needed to detect the hold.
//
// The background is deliberately NOT part of this string: the selected variant
// sets its own, and two `bg-*` utilities on one element resolve by stylesheet
// order rather than by the order they appear here.
const tileClassName =
  "relative w-full cursor-pointer touch-pan-y pb-[100%] font-light text-content-primary"

const unselectedTileClassName = `${tileClassName} bg-surface-raised`

const selectedTileClassName = `${tileClassName} bg-intent-accent-solid outline-4 -outline-offset-4 outline-intent-accent-content`

interface DirectoryProps {
  directoryName: string
  directoryPath: string
}

const Directory = ({
  directoryName,
  directoryPath,
}: DirectoryProps) => {
  const isCtrlKeyHeldRef = useRef(false)
  const tileRef = useRef<HTMLDivElement>(null)
  // A completed hold is still followed by a `click`; swallow that one click so
  // it doesn't immediately toggle the selection back off.
  const hasSuppressedClickRef = useRef(false)

  const { setFilePath } = useContext(FileSystemContext)

  const {
    enterMultiSelect,
    isMultiSelectMode,
    selectedFolderPaths,
    toggleFolder,
  } = useContext(MultiSelectContext)

  const [longPressProgress, setLongPressProgress] =
    useState(0)

  const isSelected = selectedFolderPaths.has(directoryPath)

  // Probe for a thumbnail only once the tile is in view. The probe also tells us
  // whether this is a "gallery" (holds images at any depth); only galleries can
  // be selected/queued — an image-less container folder can be opened but never
  // added to the queue.
  const isInView = useInView(tileRef)

  const { image, isResolved } = useFolderThumbnail(
    directoryPath,
    isInView,
  )

  const imageCount = useFolderImageCount(
    directoryPath,
    isInView,
  )

  const isGallery = isResolved && Boolean(image)
  const isKnownNonGallery = isResolved && !image

  useKeyboardControls((event) => {
    isCtrlKeyHeldRef.current = event.ctrlKey
  })

  const goToDirectory = useCallback(() => {
    if (isCtrlKeyHeldRef.current) {
      window.api.createNewWindow({
        filePath: directoryPath,
      })
    } else {
      setFilePath(directoryPath)
    }
  }, [directoryPath, setFilePath])

  const onClick = useCallback(() => {
    if (hasSuppressedClickRef.current) {
      hasSuppressedClickRef.current = false

      return
    }

    if (isMultiSelectMode) {
      // Tapping toggles, but only galleries take part in a selection. A
      // non-gallery folder is a no-op here — leave select mode to open it.
      if (isGallery) {
        toggleFolder(directoryPath)
      }
    } else {
      goToDirectory()
    }
  }, [
    directoryPath,
    goToDirectory,
    isGallery,
    isMultiSelectMode,
    toggleFolder,
  ])

  const onLongPressProgress = useCallback(
    (fraction: number) => {
      // Don't tease the fill ring on a folder that can't be selected.
      setLongPressProgress(isKnownNonGallery ? 0 : fraction)
    },
    [isKnownNonGallery],
  )

  const onLongPressComplete = useCallback(() => {
    setLongPressProgress(0)

    // Only galleries are selectable; and once we're already in the mode the tap
    // handler toggles, so the hold only bootstraps it — don't double-toggle.
    if (!isGallery || isMultiSelectMode) {
      return
    }

    hasSuppressedClickRef.current = true

    enterMultiSelect()

    toggleFolder(directoryPath)
  }, [
    directoryPath,
    enterMultiSelect,
    isGallery,
    isMultiSelectMode,
    toggleFolder,
  ])

  const onLongPressCancel = useCallback(() => {
    setLongPressProgress(0)
  }, [])

  useLongPress({
    domElementRef: tileRef,
    onCancel: onLongPressCancel,
    onComplete: onLongPressComplete,
    onProgress: onLongPressProgress,
  })

  return (
    <div
      className={
        isSelected
          ? selectedTileClassName
          : unselectedTileClassName
      }
      onClick={onClick}
      ref={tileRef}
    >
      <div className="absolute inset-0 flex flex-col px-[10px] py-1.5">
        <div className="break-words pb-1.5">
          {directoryName}
        </div>

        {image && (
          <div className="flex-auto">
            <Image
              fileName={image.name}
              filePath={image.path}
              hasVisibilityDetection
            />
          </div>
        )}
      </div>

      {longPressProgress > 0 && (
        <FillRing progress={longPressProgress} />
      )}

      {/* Image count, pinned bottom-right over the thumbnail. Sits opposite the
          top-right check badge so the two never overlap, and only shows for a
          gallery with a known, non-zero count. */}
      {Boolean(imageCount) && (
        <div className="absolute right-2 bottom-2 flex min-w-[22px] items-center justify-center rounded-[11px] bg-scrim px-[7px] py-0.5 text-sm font-semibold text-content-primary">
          {imageCount}
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 right-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-intent-accent-content text-lg font-semibold text-intent-accent-surface">
          ✓
        </div>
      )}
    </div>
  )
}

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
