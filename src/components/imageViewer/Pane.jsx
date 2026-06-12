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
import DeleteFileModal from "../toolkit/DeleteFileModal"
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

const propTypes = {
  isActive: PropTypes.bool.isRequired,
  pane: PropTypes.shape({
    currentIndex: PropTypes.number.isRequired,
    folderId: PropTypes.string,
    id: PropTypes.string.isRequired,
  }).isRequired,
  spawn: PropTypes.func.isRequired,
}

const Pane = ({ isActive, pane, spawn }) => {
  const {
    assignFolderPathToPane,
    assignFolderToPane,
    clearPanes,
    queuedFolders,
    setActivePaneId,
    setPaneIndex,
    suppressChromeReveal,
  } = useContext(WorkspaceContext)

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] =
    useState(false)

  // Non-null while this column is showing the in-pane gallery; holds the path
  // currently being browsed there. Local to the pane so each column browses
  // independently and the side-by-side layout never disappears.
  const [galleryBrowsePath, setGalleryBrowsePath] =
    useState(null)

  const folder = queuedFolders.find(
    ({ id }) => id === pane.folderId,
  )

  const { imageFiles, refresh } = useFolderListing(
    folder?.path,
  )

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

  // `[Delete]` on the active column asks before trashing the current image
  // (the confirmation modal is what guards the stray Delete key). Only arm it
  // when there's actually an image showing.
  const requestDelete = useCallback(() => {
    if (!imageFiles[currentIndex]) {
      return
    }

    setIsDeleteModalOpen(true)
  }, [currentIndex, imageFiles])

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false)
  }, [])

  const confirmDelete = useCallback(() => {
    const imageToDelete = imageFiles[currentIndex]

    if (!imageToDelete) {
      setIsDeleteModalOpen(false)

      return
    }

    window.api
      .deleteFilePath({
        filePath: imageToDelete.path,
        isDirectory: false,
      })
      .then(() => {
        const remainingCount = imageFiles.length - 1

        if (remainingCount <= 0) {
          // That was the column's last image — revert it to the empty `+`
          // state rather than leaving a blank column staring back.
          assignFolderToPane(pane.id, null)
        } else {
          // Hold the same slot, which now shows the next image (clamped to the
          // new end if we deleted the last one), then re-read the folder.
          setCurrentIndex(
            Math.min(currentIndex, remainingCount - 1),
          )

          refresh()
        }

        setIsDeleteModalOpen(false)
      })
  }, [
    assignFolderToPane,
    currentIndex,
    imageFiles,
    pane.id,
    refresh,
    setCurrentIndex,
  ])

  // Center-tap means "control this column": select it and open its menu (the
  // Kavita-style per-column control). Closing the column is a menu action now.
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

  // "Gallery view" from the menu → turn this column into a browsable gallery,
  // starting at its current folder (or a drive root when empty). Stays in-pane,
  // so the side-by-side layout is preserved.
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

  // Only the active column owns the keyboard, and it's silenced while the menu,
  // the in-pane gallery, or the delete confirmation is open (each handles its
  // own Esc/Enter) — so the first Esc closes that, and the next one leaves the
  // viewer.
  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled:
      isActive &&
      !isMenuOpen &&
      !isGalleryOpen &&
      !isDeleteModalOpen,
    onClose: clearPanes,
    onDelete: requestDelete,
  })

  const currentImage = folder
    ? imageFiles[currentIndex]
    : undefined

  return (
    <div
      css={
        isElevated
          ? [paneStyles, elevatedPaneStyles]
          : paneStyles
      }
    >
      {isGalleryOpen ? (
        <PaneGallery
          folderPath={galleryBrowsePath}
          onClose={closeGallery}
          onOpenImage={openImageFromGallery}
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
            onCenterHold={openMenu}
            onCenterTap={openGallery}
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

      <DeleteFileModal
        isVisible={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

Pane.propTypes = propTypes

const MemoizedPane = memo(Pane)

export default MemoizedPane
