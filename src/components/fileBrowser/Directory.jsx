import { css } from "@emotion/react"
import PropTypes from "prop-types"
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

// `pan-y` keeps the list scrollable on touch — `useLongPress` cancels itself on
// movement, so `touch-action: none` isn't needed to detect the hold.
const directoryStyles = css`
	background-color: #666;
	color: #fafafa;
	cursor: pointer;
	font-family: 'Source Sans Pro', sans-serif;
	font-weight: 300;
	padding-bottom: 100%;
	position: relative;
	touch-action: pan-y;
	width: 100%;
`

const selectedDirectoryStyles = css`
	background-color: #2a6f97;
	outline: 4px solid #61a5c2;
	outline-offset: -4px;
`

const directoryContentStyles = css`
	bottom: 0;
	display: flex;
	flex-direction: column;
	left: 0;
	padding: 6px 10px;
	position: absolute;
	right: 0;
	top: 0;
`

const imageStyles = css`
	flex: 1 1 auto;
`

const textStyles = css`
	padding-bottom: 6px;
	word-wrap: break-word;
`

const checkBadgeStyles = css`
	align-items: center;
	background-color: #61a5c2;
	border-radius: 50%;
	color: #fff;
	display: flex;
	font-size: 18px;
	font-weight: 600;
	height: 26px;
	justify-content: center;
	position: absolute;
	right: 8px;
	top: 8px;
	width: 26px;
`

// Image count, pinned bottom-right over the thumbnail. Sits opposite the
// top-right check badge so the two never overlap, and only shows for a gallery
// with a known, non-zero count.
const countBadgeStyles = css`
	align-items: center;
	background-color: rgba(0, 0, 0, 0.6);
	border-radius: 11px;
	bottom: 8px;
	color: #fafafa;
	display: flex;
	font-size: 13px;
	font-weight: 600;
	justify-content: center;
	min-width: 22px;
	padding: 2px 7px;
	position: absolute;
	right: 8px;
`

const propTypes = {
  directoryName: PropTypes.string.isRequired,
  directoryPath: PropTypes.string.isRequired,
}

const Directory = ({ directoryName, directoryPath }) => {
  const isCtrlKeyHeldRef = useRef(false)
  const tileRef = useRef()
  // A completed hold is still followed by a `click`; swallow that one click so
  // it doesn't immediately toggle the selection back off.
  const suppressNextClickRef = useRef(false)

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
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false

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
    (fraction) => {
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

    suppressNextClickRef.current = true

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
      css={
        isSelected
          ? [directoryStyles, selectedDirectoryStyles]
          : directoryStyles
      }
      onClick={onClick}
      ref={tileRef}
    >
      <div css={directoryContentStyles}>
        <div css={textStyles}>{directoryName}</div>

        {image && (
          <div css={imageStyles}>
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

      {Boolean(imageCount) && (
        <div css={countBadgeStyles}>{imageCount}</div>
      )}

      {isSelected && <div css={checkBadgeStyles}>✓</div>}
    </div>
  )
}

Directory.propTypes = propTypes

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
