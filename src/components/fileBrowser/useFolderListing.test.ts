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

afterEach(() => {
  window.api.readDirectory = originalReadDirectory
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
})
