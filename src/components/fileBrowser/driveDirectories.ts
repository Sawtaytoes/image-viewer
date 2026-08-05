import type { ImageFile } from "../../types"

// The drive list shown at the all-drives root (an empty path): each connected
// drive root (`C:\`, `G:\`, … / `/` on POSIX) as a folder tile. Mirrors what
// `useDirectories` would produce for drive entries, minus a folder to list.
//
// Computed once at import — the drive set doesn't change within a session — and
// shared so the home browser (`FileSystemProvider`) and the in-viewer gallery
// (`PaneGallery`) surface the SAME root. That shared root is what lets a gallery
// opened from a queue climb past its drive to the drive list, instead of being
// locked to the one drive it opened in.
const driveDirectories: ImageFile[] = window.api
  .getWindowsDrives()
  .map((driveLetter) => ({
    name: driveLetter,
    path: driveLetter,
  }))

export default driveDirectories
