import { renderHook } from "@testing-library/react"
import { expect, test, vi } from "vitest"

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
