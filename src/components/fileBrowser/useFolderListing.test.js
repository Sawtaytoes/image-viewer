import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import useFolderListing from "./useFolderListing"

const originalReadDirectory = window.api.readDirectory

afterEach(() => {
  window.api.readDirectory = originalReadDirectory
})

describe("useFolderListing", () => {
  it("reads the folder on mount and again on refresh()", async () => {
    const readDirectory = vi.fn(() => Promise.resolve([]))
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

  it("does not read when there is no folder path", () => {
    const readDirectory = vi.fn(() => Promise.resolve([]))
    window.api.readDirectory = readDirectory

    renderHook(() => useFolderListing(undefined))

    expect(readDirectory).not.toHaveBeenCalled()
  })
})
