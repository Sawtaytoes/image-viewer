import { renderHook } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import type { DirectoryEntry } from "../../types"
import useImageFiles from "./useImageFiles"

// `readDirectory` stamps `modifiedTime: 0` whenever it skips the per-entry stat
// — which the default name sort always does — so 0 is the honest fixture value
// rather than an omission.
const entry = (
  fileName: string,
  isFile: boolean,
): DirectoryEntry => ({
  fileName,
  filePath: `/pics/${fileName}`,
  isDirectory: !isFile,
  isFile,
  modifiedTime: 0,
})

describe("useImageFiles", () => {
  test("keeps only image files, sorted naturally, mapped to { name, path }", () => {
    const directoryContents = [
      entry("b.png", true),
      entry("a10.jpg", true),
      entry("a2.jpg", true),
      entry("notes.txt", true),
      entry("subfolder", false),
    ]

    const { result } = renderHook(() =>
      useImageFiles(directoryContents),
    )

    expect(
      result.current.map((image) => image.name),
    ).toEqual(["a2.jpg", "a10.jpg", "b.png"])

    expect(result.current[0]).toEqual({
      modifiedTime: 0,
      name: "a2.jpg",
      path: "/pics/a2.jpg",
    })
  })

  test("matches extensions case-insensitively", () => {
    // NOTE: the array must be a stable reference — useImageFiles keys its
    // effect on `directoryContents` identity (the provider passes a stable
    // value). A fresh literal each render would loop.
    const directoryContents = [entry("PHOTO.JPG", true)]

    const { result } = renderHook(() =>
      useImageFiles(directoryContents),
    )

    expect(result.current).toHaveLength(1)
  })

  test("includes HEIC/HEIF photos (transcoded later, but listed here)", () => {
    const directoryContents = [
      entry("iphone.heic", true),
      entry("iphone.HEIF", true),
    ]

    const { result } = renderHook(() =>
      useImageFiles(directoryContents),
    )

    expect(
      result.current.map((image) => image.name),
    ).toEqual(["iphone.heic", "iphone.HEIF"])
  })
})
