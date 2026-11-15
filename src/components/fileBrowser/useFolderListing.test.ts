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
  vi.useRealTimers()
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

test("polling reconciles missed notifications and marks only additions until leaving", async () => {
  vi.useFakeTimers()
  const entry = galleryEntry("old")
  const added = galleryEntry("added")
  window.api.readDirectory = vi
    .fn()
    .mockResolvedValueOnce([entry])
    .mockResolvedValue([entry, added])
  const { result, rerender, unmount } = renderHook(
    ({ path }) =>
      useFolderListing(path, {
        isWatchingForChanges: true,
      }),
    { initialProps: { path: "/pics" } },
  )
  await act(async () => {})
  expect(result.current.directories).toHaveLength(1)
  expect([...result.current.addedPaths]).toEqual([])
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000)
  })
  expect([...result.current.addedPaths]).toEqual([
    added.filePath,
  ])
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000)
  })
  expect([...result.current.addedPaths]).toEqual([
    added.filePath,
  ])
  rerender({ path: "/other" })
  await act(async () => {})
  expect([...result.current.addedPaths]).toEqual([])
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test("a notification during initial read is reconciled after that read", async () => {
  let resolveInitial:
    | ((entries: ReturnType<typeof galleryEntry>[]) => void)
    | undefined
  let notify: (() => void) | undefined
  const read = vi
    .fn<Window["api"]["readDirectory"]>()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve
        }),
    )
    .mockResolvedValue([galleryEntry("new")])
  window.api.readDirectory = read
  window.api.watchDirectory = (_path, onChange) => {
    notify = onChange
    return () => {}
  }
  const { result } = renderHook(() =>
    useFolderListing("/pics", {
      isWatchingForChanges: true,
    }),
  )
  act(() => {
    notify?.()
  })
  expect(read).toHaveBeenCalledTimes(1)
  await act(async () => {
    resolveInitial?.([galleryEntry("old")])
  })
  await waitFor(() =>
    expect(
      result.current.directories.map(({ name }) => name),
    ).toEqual(["new"]),
  )
  expect([...result.current.addedPaths]).toEqual([
    "/pics/new",
  ])
})

test("late reads cannot replace the folder after navigation", async () => {
  let resolveInitial:
    | ((entries: ReturnType<typeof galleryEntry>[]) => void)
    | undefined
  window.api.readDirectory = vi
    .fn<Window["api"]["readDirectory"]>()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve
        }),
    )
    .mockResolvedValue([galleryEntry("other")])
  const { result, rerender } = renderHook(
    ({ path }) => useFolderListing(path),
    { initialProps: { path: "/pics" } },
  )
  rerender({ path: "/other" })
  await waitFor(() =>
    expect(
      result.current.directories.map(({ name }) => name),
    ).toEqual(["other"]),
  )
  await act(async () => {
    resolveInitial?.([galleryEntry("stale")])
  })
  expect(
    result.current.directories.map(({ name }) => name),
  ).toEqual(["other"])
})
