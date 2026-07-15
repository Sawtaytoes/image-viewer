import { css } from "@emotion/react"
import { useCallback, useContext, useEffect } from "react"

import FileSystemContext from "../fileBrowser/FileSystemContext"
import ImageViewerContext from "../imageViewer/ImageViewerContext"
import WorkspaceContext from "../workspace/WorkspaceContext"
import TITLE_BAR_HEIGHT from "./titleBarHeight"

const pathApi = window.api.path

// The whole strip is a drag handle (`-webkit-app-region: drag`) so the frameless
// window can still be moved; interactive children opt back out with `no-drag`.
// The right edge is left as empty drag space for the native window controls that
// `titleBarOverlay` paints there (Windows/macOS), so nothing sits under them.
const titleBarStyles = css`
	-webkit-app-region: drag;
	align-items: center;
	background-color: #2b2b2b;
	color: #fafafa;
	display: flex;
	gap: 6px;
	height: ${TITLE_BAR_HEIGHT}px;
	left: 0;
	padding: 0 10px;
	position: fixed;
	right: 0;
	top: 0;
	user-select: none;
	z-index: 10000;
`

const appNameStyles = css`
	color: #d6d6d6;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
`

const buttonStyles = css`
	-webkit-app-region: no-drag;
	background: transparent;
	border: 0;
	border-radius: 5px;
	color: #fafafa;
	cursor: pointer;
	flex: 0 0 auto;
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 13px;
	font-weight: 400;
	padding: 5px 10px;
	white-space: nowrap;

	&:hover:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.12);
	}

	&:active:not(:disabled) {
		background-color: rgba(255, 255, 255, 0.2);
	}

	&:disabled {
		color: #777;
		cursor: default;
	}
`

// A hair of separation between the load action and the two close actions.
const separatorStyles = css`
	background-color: #444;
	flex: 0 0 auto;
	height: 18px;
	width: 1px;
`

const TitleBar = () => {
  const { filePath } = useContext(FileSystemContext)

  const { imageFilePath } = useContext(ImageViewerContext)

  const {
    clearQueue,
    hasSavedQueue,
    loadQueue,
    queuedFolders,
    saveQueue,
  } = useContext(WorkspaceContext)

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
  const showLoad = hasSavedQueue
  const showSaveForLater = hasQueue
  const showClose = hasSavedQueue && hasQueue
  const showAnyAction =
    showLoad || showSaveForLater || showClose

  // "Save for later": snapshot the queue, then clear it once the write lands, so
  // the saved slot is guaranteed on disk before the live queue empties.
  const saveAndCloseQueue = useCallback(() => {
    saveQueue().then(clearQueue)
  }, [clearQueue, saveQueue])

  return (
    <div css={titleBarStyles}>
      <span css={appNameStyles}>Image Viewer</span>

      {showAnyAction && <div css={separatorStyles} />}

      {showLoad && (
        <button
          css={buttonStyles}
          onClick={loadQueue}
          title="Load the saved queue"
          type="button"
        >
          Load queue
        </button>
      )}

      {showSaveForLater && (
        <button
          css={buttonStyles}
          onClick={saveAndCloseQueue}
          title="Save the current queue for later, then close it"
          type="button"
        >
          Save for later
        </button>
      )}

      {showClose && (
        <button
          css={buttonStyles}
          onClick={clearQueue}
          title="Close the queue without saving"
          type="button"
        >
          Close queue
        </button>
      )}
    </div>
  )
}

export default TitleBar
