import type { ImageFile } from "../../types"

// The drive list shown at the all-drives root (an empty path): each connected
// drive root (`C:\`, `G:\`, …) as a folder tile — or, on macOS and Linux, the
// root, the home folder and each mounted volume (see `src/driveRoots.ts`). Mirrors what
// `useDirectories` would produce for drive entries, minus a folder to list.
//
// Computed once at import — the drive set doesn't change within a session — and
// shared so the home browser (`FileSystemProvider`) and the in-viewer gallery
// (`PaneGallery`) surface the SAME root. That shared root is what lets a gallery
// opened from a queue climb past its drive to the drive list, instead of being
// locked to the one drive it opened in.
const driveDirectories: ImageFile[] = window.api
  .getDriveRoots()
  .map((driveRoot) => ({
    name: driveRoot,
    path: driveRoot,
  }))

export default driveDirectories
