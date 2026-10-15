// The places the home screen lists as tiles before any folder is open.
//
// Windows has drive letters, so the list is every `A:\`..`Z:\` that exists —
// probed with `existsSync`, because the old `wmic logicaldisk` call is gone on
// modern Windows 11 (see docs/research/0006).
//
// macOS and Linux have one root, so a list of drive letters there is empty and
// the home screen showed nothing at all. The POSIX list is the root, the home
// folder, and every mounted volume the desktop puts under its usual mount
// directories: `/Volumes` on macOS; `/media/<user>`, `/run/media/<user>` (udisks
// on Fedora and Arch) and `/mnt` on Linux. The root comes first because the
// gallery treats the first entry as its fallback browse path.
//
// The file system is injected so the rule can be tested without a disk.

type DriveRootsInput = {
  homeDirectory: string
  isExistingPath: (targetPath: string) => boolean
  // Child DIRECTORIES of `directoryPath` as full paths, or [] when it is
  // missing. A symbolic link is not a directory here, which is what drops
  // macOS's `/Volumes/Macintosh HD` — a link back to `/` that would otherwise
  // list the boot disk twice.
  listChildDirectories: (directoryPath: string) => string[]
  platform: NodeJS.Platform
  userName: string
}

const getWindowsDriveRoots = (
  isExistingPath: DriveRootsInput["isExistingPath"],
) =>
  Array.from(
    { length: 26 },
    (_, index) => `${String.fromCharCode(65 + index)}:\\`,
  ).filter((driveRoot) => isExistingPath(driveRoot))

const getMountDirectories = ({
  platform,
  userName,
}: Pick<DriveRootsInput, "platform" | "userName">) =>
  platform === "darwin"
    ? ["/Volumes"]
    : [
        `/media/${userName}`,
        `/run/media/${userName}`,
        "/mnt",
      ]

const getDriveRoots = ({
  homeDirectory,
  isExistingPath,
  listChildDirectories,
  platform,
  userName,
}: DriveRootsInput): string[] => {
  if (platform === "win32") {
    return getWindowsDriveRoots(isExistingPath)
  }

  const driveRoots = [
    "/",
    homeDirectory,
    ...getMountDirectories({ platform, userName }).flatMap(
      (mountDirectory) =>
        listChildDirectories(mountDirectory),
    ),
  ].filter(Boolean)

  return Array.from(new Set(driveRoots))
}

export default getDriveRoots
