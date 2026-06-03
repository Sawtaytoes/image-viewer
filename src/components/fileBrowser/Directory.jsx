import { css } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { from } from "rxjs"

import useKeyboardControls from "../convenience/useKeyboardControls"
import Image from "../imageViewer/Image"
import useLongPress from "../imageViewer/useLongPress"
import FileSystemContext from "./FileSystemContext"
import FillRing from "./FillRing"
import MultiSelectContext from "./MultiSelectContext"
import useImageFiles from "./useImageFiles"

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

const initialDirectoryContents = []

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

  const [directoryContents, setDirectoryContents] =
    useState(initialDirectoryContents)

  const [longPressProgress, setLongPressProgress] =
    useState(0)

  const isSelected = selectedFolderPaths.has(directoryPath)

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
      toggleFolder(directoryPath)
    } else {
      goToDirectory()
    }
  }, [
    directoryPath,
    goToDirectory,
    isMultiSelectMode,
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

  useEffect(() => {
    if (!directoryPath) {
      return
    }

    const subscription = from(
      window.api.readDirectory(directoryPath),
    ).subscribe(setDirectoryContents)

    return () => {
      subscription.unsubscribe()
    }
  }, [directoryPath])

  const imageFiles = useImageFiles(directoryContents)

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

        {imageFiles[0] && (
          <div css={imageStyles}>
            <Image
              fileName={imageFiles[0].name}
              filePath={imageFiles[0].path}
              hasVisibilityDetection
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

Directory.propTypes = propTypes

const MemoizedDirectory = memo(Directory)

export default MemoizedDirectory
