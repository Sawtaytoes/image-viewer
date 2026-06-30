import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import useFolderListing from "../fileBrowser/useFolderListing"
import WorkspaceContext from "../workspace/WorkspaceContext"
import EmptyPaneAffordance from "./EmptyPaneAffordance"
import FolderPickerPopover from "./FolderPickerPopover"
import ImageView from "./ImageView"
import PaneGallery from "./PaneGallery"
import usePaneNavigation from "./usePaneNavigation"
import useViewerKeyboard from "./useViewerKeyboard"

// Where the in-pane gallery starts when the column has no folder yet: the first
// drive (Windows) or the filesystem root (POSIX).
const getRootBrowsePath = () =>
  window.api.getWindowsDrives()?.[0] ??
  (window.api.path.sep === "\\" ? "C:\\" : "/")

// A new column slides/fades in so adding one (`+` or a queued tab) reads as a
// deliberate change rather than a pop.
const paneIn = keyframes`
	from {
		opacity: 0;
		transform: translateY(10px) scale(0.985);
	}
	to {
		opacity: 1;
		transform: none;
	}
`

// `touch-action: none`: a pane isn't scrollable, so taps and the chrome
// summon-swipe must not be read as a browser pan/zoom.
const paneStyles = css`
	animation: ${paneIn} 220ms ease;
	flex: 1 1 0;
	height: 100%;
	min-width: 0;
	position: relative;
	touch-action: none;
`

// While this column owns a gallery or menu, lift it above the chrome's top
// hit-strip (`z-index: 1`) so the gallery's up/close controls stay tappable —
// but keep it below the chrome bar itself (`z-index: 3`) so the revealed bar
// still sits on top.
const elevatedPaneStyles = css`
	z-index: 2;
`

// Shown only while the top queue bar is revealed, so the user can see which
// column a queue-tab tap (or the `+`) will load into. Hidden again the moment
// the bar auto-hides — an always-on outline read as a glitch.
const activePaneStyles = css`
	box-shadow: inset 0 0 0 3px #2a6f97;
`

const propTypes = {
  isActive: PropTypes.bool.isRequired,
  // True while the top queue/chrome bar is revealed; gates the active outline.
  isChromeRevealed: PropTypes.bool.isRequired,
  pane: PropTypes.shape({
    currentIndex: PropTypes.number.isRequired,
    folderId: PropTypes.string,
    id: PropTypes.string.isRequired,
  }).isRequired,
  spawn: PropTypes.func.isRequired,
}

const Pane = ({
  isActive,
  isChromeRevealed,
  pane,
  spawn,
}) => {
  const {
    assignFolderPathToPane,
    clearPanes,
    queuedFolders,
    setActivePaneId,
    setPaneIndex,
    suppressChromeReveal,
  } = useContext(WorkspaceContext)

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Non-null while this column is showing the in-pane gallery; holds the path
  // currently being browsed there. Local to the pane so each column browses
  // independently and the side-by-side layout never disappears.
  const [galleryBrowsePath, setGalleryBrowsePath] =
    useState(null)

  const folder = queuedFolders.find(
    ({ id }) => id === pane.folderId,
  )

  const { imageFiles } = useFolderListing(folder?.path)

  const setCurrentIndex = useCallback(
    (index) => {
      setPaneIndex(pane.id, index)
    },
    [pane.id, setPaneIndex],
  )

  // Clamp against the listing in case the folder changed under a stale index.
  const currentIndex = Math.min(
    pane.currentIndex,
    Math.max(0, imageFiles.length - 1),
  )

  const {
    goToNextImage,
    goToPreviousImage,
    isAtBeginning,
    isAtEnd,
  } = usePaneNavigation({
    currentIndex,
    imageFiles,
    setCurrentIndex,
  })

  // Center-tap means "control this column": select it and open its menu (the
  // Kavita-style per-column control) — the modal for assigning a queued folder,
  // opening the gallery, or closing the column. A center-hold instead jumps
  // straight to the gallery (see `openGallery`).
  const openMenu = useCallback(
    (point) => {
      if (point) {
        spawn({
          variant: "reveal",
          x: point.x,
          y: point.y,
        })
      }

      setActivePaneId(pane.id)

      setIsMenuOpen(true)
    },
    [pane.id, setActivePaneId, spawn],
  )

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  // "Gallery view" (from the menu or a center-hold) → turn this column into a
  // browsable gallery, starting at its current folder (or a drive root when
  // empty). Stays in-pane, so the side-by-side layout is preserved.
  const openGallery = useCallback(() => {
    setIsMenuOpen(false)

    setGalleryBrowsePath(
      folder?.path ?? getRootBrowsePath(),
    )
  }, [folder?.path])

  const closeGallery = useCallback(() => {
    setGalleryBrowsePath(null)
  }, [])

  // Tapping an image in the gallery loads its folder into this column (queued
  // if new) and jumps to that image, then drops back to the single-image view.
  const openImageFromGallery = useCallback(
    (browsePath, imageIndex) => {
      assignFolderPathToPane(
        pane.id,
        {
          name: window.api.path.basename(browsePath),
          path: browsePath,
        },
        imageIndex,
      )

      setGalleryBrowsePath(null)
    },
    [assignFolderPathToPane, pane.id],
  )

  const isGalleryOpen = galleryBrowsePath !== null

  const isElevated = isGalleryOpen || isMenuOpen

  // When this pane stops showing an overlay (gallery/menu closed by any path),
  // tell the chrome to ignore hover-reveal for a beat. Closing unmounts the
  // overlay from above the chrome's top hit-strip, so the browser fires a
  // pointer event on the strip under the stationary cursor — which would
  // otherwise pop the top bar open right where the close button was.
  const wasElevatedRef = useRef(isElevated)

  useEffect(() => {
    if (wasElevatedRef.current && !isElevated) {
      suppressChromeReveal()
    }

    wasElevatedRef.current = isElevated
  }, [isElevated, suppressChromeReveal])

  // Only the active column owns the keyboard, and it's silenced while the menu
  // or the in-pane gallery is open (each handles its own Esc) — so the first Esc
  // closes that, and the next one leaves the viewer. The viewer deletes folders
  // (from the menu's trashcan), not single images, so there's no `[Delete]` key
  // action here.
  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled: isActive && !isMenuOpen && !isGalleryOpen,
    onClose: clearPanes,
  })

  const currentImage = folder
    ? imageFiles[currentIndex]
    : undefined

  // The gallery pre-selects the *next* image (cull-forward flow): one past the
  // current, clamped so the last image stays selected when there's no next.
  // Null when the column has no image loaded, so a fresh gallery selects nothing.
  const nextImagePath = currentImage
    ? (imageFiles[
        Math.min(currentIndex + 1, imageFiles.length - 1)
      ]?.path ?? null)
    : null

  return (
    <div
      css={[
        paneStyles,
        isElevated && elevatedPaneStyles,
        isActive && isChromeRevealed && activePaneStyles,
      ]}
    >
      {isGalleryOpen ? (
        <PaneGallery
          folderPath={galleryBrowsePath}
          onClose={closeGallery}
          onOpenImage={openImageFromGallery}
          selectedImagePath={nextImagePath}
        />
      ) : folder ? (
        currentImage && (
          <ImageView
            goToNextImage={goToNextImage}
            goToPreviousImage={goToPreviousImage}
            imageFileName={currentImage.name}
            imageFilePath={currentImage.path}
            isAtBeginning={isAtBeginning}
            isAtEnd={isAtEnd}
            onCenterHold={openGallery}
            onCenterTap={openMenu}
          />
        )
      ) : (
        <EmptyPaneAffordance onActivate={openMenu} />
      )}

      {isMenuOpen && (
        <FolderPickerPopover
          currentFolderId={pane.folderId}
          onClose={closeMenu}
          onOpenGallery={openGallery}
          paneId={pane.id}
        />
      )}
    </div>
  )
}

Pane.propTypes = propTypes

const MemoizedPane = memo(Pane)

export default MemoizedPane
