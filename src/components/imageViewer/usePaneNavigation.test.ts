import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import usePaneNavigation from "./usePaneNavigation"

const imageFiles = [
  { name: "a", path: "/a" },
  { name: "b", path: "/b" },
  { name: "c", path: "/c" },
]

describe("usePaneNavigation", () => {
  it("advances and clamps at the end", () => {
    const setCurrentIndex = vi.fn()

    const { result } = renderHook(() =>
      usePaneNavigation({
        currentIndex: 1,
        imageFiles,
        setCurrentIndex,
      }),
    )

    result.current.goToNextImage()

    expect(setCurrentIndex).toHaveBeenCalledWith(2)
  })

  it("does not advance past the last image", () => {
    const setCurrentIndex = vi.fn()

    const { result } = renderHook(() =>
      usePaneNavigation({
        currentIndex: 2,
        imageFiles,
        setCurrentIndex,
      }),
    )

    result.current.goToNextImage()

    expect(setCurrentIndex).toHaveBeenCalledWith(2)
    expect(result.current.isAtEnd).toBe(true)
    expect(result.current.isAtBeginning).toBe(false)
  })

  it("retreats and clamps at the beginning", () => {
    const setCurrentIndex = vi.fn()

    const { result } = renderHook(() =>
      usePaneNavigation({
        currentIndex: 0,
        imageFiles,
        setCurrentIndex,
      }),
    )

    result.current.goToPreviousImage()

    expect(setCurrentIndex).toHaveBeenCalledWith(0)
    expect(result.current.isAtBeginning).toBe(true)
    expect(result.current.isAtEnd).toBe(false)
  })
})
