import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import FullScreenContext from "../convenience/FullScreenContext"
import useFolderListing from "../fileBrowser/useFolderListing"
import type { Pane as WorkspacePane } from "../workspace/WorkspaceContext"
import WorkspaceContext from "../workspace/WorkspaceContext"
import EmptyPaneAffordance from "./EmptyPaneAffordance"
import FolderPickerPopover from "./FolderPickerPopover"
import ImageView from "./ImageView"
import PaneGallery from "./PaneGallery"
import type { TapPoint } from "./TapFeedback"
import usePaneNavigation from "./usePaneNavigation"
import type { SpawnTapFeedback } from "./useTapFeedback"
import useViewerKeyboard from "./useViewerKeyboard"

// Where the in-pane gallery starts when the column has no folder yet: the first
// drive (Windows) or the filesystem root (POSIX).
const getRootBrowsePath = (): string =>
  window.api.getWindowsDrives()?.[0] ??
  (window.api.path.sep === "\\" ? "C:\\" : "/")

// `touch-none`: a pane isn't scrollable, so taps and the chrome summon-swipe
// must not be read as a browser pan/zoom.
const PANE_CLASSES =
  "relative h-full min-w-0 flex-1 animate-pane-in touch-none"

// While this column owns a gallery or menu, lift it above the chrome's top
// hit-strip (`z-index: 1`) so the gallery's up/close controls stay tappable —
// but keep it below the chrome bar itself (`z-index: 3`) so the revealed bar
// still sits on top.
const ELEVATED_PANE_CLASSES = "z-[2]"

// Shown only while the top queue bar is revealed, so the user can see which
// column a queue-tab tap (or the `+`) will load into. Hidden again the moment
// the bar auto-hides — an always-on outline read as a glitch.
const ACTIVE_PANE_CLASSES =
  "shadow-[inset_0_0_0_3px_var(--color-intent-accent-solid)]"

interface PaneProps {
  isActive: boolean
  // True while the top queue/chrome bar is revealed; gates the active outline.
  isChromeRevealed: boolean
  pane: WorkspacePane
  spawn: (request: SpawnTapFeedback) => void
}

const Pane = ({
  isActive,
  isChromeRevealed,
  pane,
  spawn,
}: PaneProps) => {
  const {
    assignFolderPathToPane,
    clearPanes,
    queuedFolders,
    setActivePaneId,
    setPaneIndex,
    suppressChromeReveal,
  } = useContext(WorkspaceContext)

  const { isFullScreen, toggleFullScreen } = useContext(
    FullScreenContext,
  )

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Non-null while this column is showing the in-pane gallery; holds the path
  // currently being browsed there. Local to the pane so each column browses
  // independently and the side-by-side layout never disappears.
  const [galleryBrowsePath, setGalleryBrowsePath] =
    useState<string | null>(null)

  const folder = queuedFolders.find(
    ({ id }) => id === pane.folderId,
  )

  const { imageFiles } = useFolderListing(folder?.path)

  const setCurrentIndex = useCallback(
    (index: number) => {
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
    (point?: TapPoint) => {
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
    (browsePath: string, imageIndex: number) => {
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
  // or the in-pane gallery is open (each handles its own Esc) — so Escape peels
  // layers: menu/gallery → fullscreen → leave the viewer (`clearPanes`). The
  // viewer deletes folders (from the menu's trashcan), not single images, so
  // there's no `[Delete]` key action here.
  useViewerKeyboard({
    goToNextImage,
    goToPreviousImage,
    isEnabled: isActive && !isMenuOpen && !isGalleryOpen,
    isFullScreen,
    onClose: clearPanes,
    onExitFullScreen: toggleFullScreen,
    // `Q` opens this column's queue menu. Called with no point (no tap origin),
    // so `openMenu` skips the reveal-spawn and just selects + opens the menu.
    onOpenMenu: openMenu,
  })

  const currentImage = folder
    ? imageFiles[currentIndex]
    : undefined

  return (
    <div
      className={`${PANE_CLASSES}${
        isElevated ? ` ${ELEVATED_PANE_CLASSES}` : ""
      }${
        isActive && isChromeRevealed
          ? ` ${ACTIVE_PANE_CLASSES}`
          : ""
      }`}
    >
      {isGalleryOpen ? (
        <PaneGallery
          currentImagePath={currentImage?.path ?? null}
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

const MemoizedPane = memo(Pane)

export default MemoizedPane
