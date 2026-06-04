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
import useFolderListing from "../fileBrowser/useFolderListing"
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

  const onClick = useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false

      return
    }

    if (isMultiSelectMode) {
      toggleFolder(directoryPath)
    } else {
      onOpen(directoryPath)
    }
  }, [
    directoryPath,
    isMultiSelectMode,
    onOpen,
    toggleFolder,
  ])

  const onLongPressProgress = useCallback((fraction) => {
    setLongPressProgress(fraction)
  }, [])

  const onLongPressComplete = useCallback(() => {
    setLongPressProgress(0)

    // Already toggling on tap once we're in the mode — the hold only bootstraps
    // it, so don't double-toggle.
    if (isMultiSelectMode) {
      return
    }

    suppressNextClickRef.current = true

    enterMultiSelect()

    toggleFolder(directoryPath)
  }, [
    directoryPath,
    enterMultiSelect,
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

  const { imageFiles } = useFolderListing(directoryPath)

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

        {imageFiles[0] && (
          <div css={previewStyles}>
            <PaneThumbnail
              fileName={imageFiles[0].name}
              filePath={imageFiles[0].path}
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
