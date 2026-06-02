import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import useImageFiles from "./useImageFiles"

const entry = (fileName, isFile) => ({
  fileName,
  filePath: `/pics/${fileName}`,
  isDirectory: !isFile,
  isFile,
})

describe("useImageFiles", () => {
  it("keeps only image files, sorted naturally, mapped to { name, path }", () => {
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
      name: "a2.jpg",
      path: "/pics/a2.jpg",
    })
  })

  it("matches extensions case-insensitively", () => {
    // NOTE: the array must be a stable reference — useImageFiles keys its
    // effect on `directoryContents` identity (the provider passes a stable
    // value). A fresh literal each render would loop.
    const directoryContents = [entry("PHOTO.JPG", true)]

    const { result } = renderHook(() =>
      useImageFiles(directoryContents),
    )

    expect(result.current).toHaveLength(1)
  })
})
