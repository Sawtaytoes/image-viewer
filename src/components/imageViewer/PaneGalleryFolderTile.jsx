import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"

import FillRing from "../fileBrowser/FillRing"
import MultiSelectContext from "../fileBrowser/MultiSelectContext"
import useFolderThumbnail from "../fileBrowser/useFolderThumbnail"
import useInView from "../fileBrowser/useInView"
import PaneThumbnail from "./PaneThumbnail"
import useLongPress from "./useLongPress"

// `pan-y` keeps the grid scrollable on touch — `useLongPress` cancels itself on
// movement, so `touch-action: none` isn't needed to detect the hold.
const folderTileStyles = css`
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

const selectedFolderTileStyles = css`
	background-color: #2a6f97;
	outline: 4px solid #61a5c2;
	outline-offset: -4px;
`

const folderContentStyles = css`
	bottom: 0;
	display: flex;
	flex-direction: column;
	left: 0;
	padding: 6px 10px;
	position: absolute;
	right: 0;
	top: 0;
`

const textStyles = css`
	overflow: hidden;
	padding-bottom: 6px;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const previewStyles = css`
	flex: 1 1 auto;
	position: relative;
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

const propTypes = {
  directoryName: PropTypes.string.isRequired,
  directoryPath: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
}

// A folder tile in the in-pane gallery. Tapping drills in (`onOpen`); a
// long-press bootstraps multi-select (same as the home gallery's `Directory`)
// so several folders can be queued at once.
const PaneGalleryFolderTile = ({
  directoryName,
  directoryPath,
  onOpen,
}) => {
  const tileRef = useRef()
  // A completed hold is still followed by a `click`; swallow that one click so
  // it doesn't immediately toggle the selection back off.
  const suppressNextClickRef = useRef(false)

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
  // be selected/queued — a folder of nothing but subfolders, or an image-less
  // container, can be browsed into but never added to the queue.
  const isInView = useInView(tileRef)

  const { image, isResolved } = useFolderThumbnail(
    directoryPath,
    isInView,
  )

  const isGallery = isResolved && Boolean(image)
  const isKnownNonGallery = isResolved && !image

  const onClick = useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false

      return
    }

    if (isMultiSelectMode) {
      // Tapping toggles, but only galleries take part in a selection. A
      // non-gallery folder is a no-op here — leave select mode to drill in.
      if (isGallery) {
        toggleFolder(directoryPath)
      }
    } else {
      onOpen(directoryPath)
    }
  }, [
    directoryPath,
    isGallery,
    isMultiSelectMode,
    onOpen,
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
          ? [folderTileStyles, selectedFolderTileStyles]
          : folderTileStyles
      }
      onClick={onClick}
      ref={tileRef}
    >
      <div css={folderContentStyles}>
        <div css={textStyles}>{directoryName}</div>

        {image && (
          <div css={previewStyles}>
            <PaneThumbnail
              fileName={image.name}
              filePath={image.path}
            />
          </div>
        )}
      </div>

      {longPressProgress > 0 && (
        <FillRing progress={longPressProgress} />
      )}

      {isSelected && <div css={checkBadgeStyles}>✓</div>}
    </div>
  )
}

PaneGalleryFolderTile.propTypes = propTypes

const MemoizedPaneGalleryFolderTile = memo(
  PaneGalleryFolderTile,
)

export default MemoizedPaneGalleryFolderTile
