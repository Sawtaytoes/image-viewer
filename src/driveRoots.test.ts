import { describe, expect, test } from "vitest"

import getDriveRoots from "./driveRoots"

// A fake disk: the paths that exist, and the child directories of each.
const createDisk = (
  childDirectoriesByPath: Record<string, string[]>,
) => ({
  isExistingPath: (targetPath: string) =>
    targetPath in childDirectoriesByPath,
  listChildDirectories: (directoryPath: string) =>
    childDirectoriesByPath[directoryPath] ?? [],
})

describe("getDriveRoots", () => {
  test("lists the drive letters that exist on Windows", () => {
    expect(
      getDriveRoots({
        ...createDisk({ "C:\\": [], "G:\\": [] }),
        homeDirectory: "C:\\Users\\someone",
        platform: "win32",
        userName: "someone",
      }),
    ).toEqual(["C:\\", "G:\\"])
  })

  test("lists the root, the home folder and the mounted volumes on Linux", () => {
    expect(
      getDriveRoots({
        ...createDisk({
          "/media/someone": ["/media/someone/Photos"],
          "/mnt": ["/mnt/backup"],
          "/run/media/someone": ["/run/media/someone/Card"],
        }),
        homeDirectory: "/home/someone",
        platform: "linux",
        userName: "someone",
      }),
    ).toEqual([
      "/",
      "/home/someone",
      "/media/someone/Photos",
      "/run/media/someone/Card",
      "/mnt/backup",
    ])
  })

  test("lists the root, the home folder and /Volumes on macOS", () => {
    expect(
      getDriveRoots({
        ...createDisk({
          "/Volumes": ["/Volumes/Photos"],
        }),
        homeDirectory: "/Users/someone",
        platform: "darwin",
        userName: "someone",
      }),
    ).toEqual(["/", "/Users/someone", "/Volumes/Photos"])
  })

  test("still lists the root when there is no home folder and nothing is mounted", () => {
    expect(
      getDriveRoots({
        ...createDisk({}),
        homeDirectory: "",
        platform: "linux",
        userName: "someone",
      }),
    ).toEqual(["/"])
  })
})
