import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react"
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import useFolderListing from "./useFolderListing"

const originalReadDirectory = window.api.readDirectory
const originalWatchDirectory = window.api.watchDirectory

afterEach(() => {
  window.api.readDirectory = originalReadDirectory
  window.api.watchDirectory = originalWatchDirectory
})

const galleryEntry = (fileName: string) => ({
  fileName,
  filePath: `/pics/${fileName}`,
  isDirectory: true,
  isFile: false,
  modifiedTime: 0,
})

describe("useFolderListing", () => {
  test("reads the folder on mount and again on refresh()", async () => {
    // Typed with the bridge's own signature so the call assertions below check
    // the arguments the real `readDirectory` takes, not a bare `() => …`.
    const readDirectory = vi.fn<
      Window["api"]["readDirectory"]
    >(() => Promise.resolve([]))
    window.api.readDirectory = readDirectory

    const { result } = renderHook(() =>
      useFolderListing("/pics"),
    )

    await waitFor(() => {
      expect(readDirectory).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(readDirectory).toHaveBeenCalledTimes(2)
    })

    // Default (name) sort skips the per-entry mtime stat, so it opts out.
    expect(readDirectory).toHaveBeenLastCalledWith(
      "/pics",
      {
        withModifiedTime: false,
      },
    )
  })

  test("does not read when there is no folder path", () => {
    const readDirectory = vi.fn<
      Window["api"]["readDirectory"]
    >(() => Promise.resolve([]))
    window.api.readDirectory = readDirectory

    renderHook(() => useFolderListing(undefined))

    expect(readDirectory).not.toHaveBeenCalled()
  })

  test("re-reads in place when a watched folder changes on disk", async () => {
    const readDirectory = vi
      .fn<Window["api"]["readDirectory"]>()
      .mockResolvedValueOnce([galleryEntry("old")])
      .mockResolvedValueOnce([galleryEntry("new")])
    window.api.readDirectory = readDirectory

    const notifyChange: { current?: () => void } = {}
    const stopWatching = vi.fn()

    window.api.watchDirectory = vi.fn<
      Window["api"]["watchDirectory"]
    >((_directoryPath, onChange) => {
      notifyChange.current = onChange

      return stopWatching
    })

    const { result, unmount } = renderHook(() =>
      useFolderListing("/pics", {
        isWatchingForChanges: true,
      }),
    )

    await waitFor(() => {
      expect(
        result.current.directories.map(({ name }) => name),
      ).toEqual(["old"])
    })

    act(() => {
      notifyChange.current?.()
    })

    // No blank-and-spinner in between: the old tile stays until the new read.
    expect(result.current.isLoading).toBe(false)

    await waitFor(() => {
      expect(
        result.current.directories.map(({ name }) => name),
      ).toEqual(["new"])
    })

    unmount()

    expect(stopWatching).toHaveBeenCalledOnce()
  })

  test("does not watch unless asked to", () => {
    const watchDirectory = vi.fn<
      Window["api"]["watchDirectory"]
    >(() => () => undefined)
    window.api.watchDirectory = watchDirectory

    renderHook(() => useFolderListing("/pics"))

    expect(watchDirectory).not.toHaveBeenCalled()
  })
})
