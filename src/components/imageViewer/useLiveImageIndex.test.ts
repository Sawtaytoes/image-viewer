import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react"
import { expect, test, vi } from "vitest"

import type { DirectoryEntry } from "../../types"
import useFolderListing from "../fileBrowser/useFolderListing"

import useLiveImageIndex from "./useLiveImageIndex"

const images = (...names: string[]) =>
  names.map((name) => ({ name, path: `/pics/${name}` }))

test("keeps the displayed path through insertions and removals before it", () => {
  const setIndex = vi.fn()
  const { result, rerender } = renderHook(
    ({ files, index }) =>
      useLiveImageIndex("/pics", files, index, setIndex),
    { initialProps: { files: images("b", "c"), index: 1 } },
  )
  rerender({ files: images("a", "b", "c"), index: 1 })
  expect(result.current).toBe(2)
  expect(setIndex).toHaveBeenLastCalledWith(2)
  rerender({ files: images("a", "b", "c"), index: 2 })
  expect(result.current).toBe(2)
  rerender({ files: images("b", "c"), index: 2 })
  expect(result.current).toBe(1)
})

test("retains a saved index until the initial listing arrives and honors navigation", () => {
  const setIndex = vi.fn()
  const { result, rerender } = renderHook(
    ({ files, index }) =>
      useLiveImageIndex("/pics", files, index, setIndex),
    { initialProps: { files: images(), index: 2 } },
  )
  rerender({ files: images("a", "b", "c"), index: 2 })
  expect(result.current).toBe(2)
  rerender({ files: images("a", "b", "c"), index: 0 })
  expect(result.current).toBe(0)
  rerender({ files: images("a", "b"), index: 0 })
  expect(result.current).toBe(0)
})

test("switching folders does not clamp a saved index against the previous folder", async () => {
  const originalRead = window.api.readDirectory
  const setIndex = vi.fn()
  let resolveNext:
    | ((entries: DirectoryEntry[]) => void)
    | undefined
  const entries = (
    folder: string,
    count: number,
  ): DirectoryEntry[] =>
    Array.from({ length: count }, (_, index) => ({
      fileName: `${index}.png`,
      filePath: `${folder}/${index}.png`,
      modifiedTime: 0,
      isDirectory: false,
      isFile: true,
    }))
  window.api.readDirectory = vi
    .fn<Window["api"]["readDirectory"]>()
    .mockResolvedValueOnce(entries("/first", 2))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve
        }),
    )
  try {
    const { result, rerender, unmount } = renderHook(
      ({ folder, index }) => {
        const { imageFiles } = useFolderListing(folder, {
          isWatchingForChanges: true,
        })
        return {
          imageFiles,
          index: useLiveImageIndex(
            folder,
            imageFiles,
            index,
            setIndex,
          ),
        }
      },
      { initialProps: { folder: "/first", index: 0 } },
    )
    await waitFor(() =>
      expect(result.current.imageFiles).toHaveLength(2),
    )
    rerender({ folder: "/second", index: 5 })
    expect(result.current.imageFiles).toHaveLength(0)
    expect(result.current.index).toBe(5)
    expect(setIndex).not.toHaveBeenCalled()
    await act(async () => {
      resolveNext?.(entries("/second", 10))
    })
    expect(result.current.imageFiles).toHaveLength(10)
    expect(
      result.current.imageFiles[result.current.index]?.path,
    ).toBe("/second/5.png")
    expect(setIndex).not.toHaveBeenCalled()
    unmount()
  } finally {
    window.api.readDirectory = originalRead
  }
})
