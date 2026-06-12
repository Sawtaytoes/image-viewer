import { describe, expect, it } from "vitest"

import compareNaturalStrings from "./compareNaturalStrings"

describe("compareNaturalStrings", () => {
  it("orders embedded numbers numerically, not lexically", () => {
    const sorted = [
      "img10.png",
      "img2.png",
      "img1.png",
    ].sort(compareNaturalStrings)

    expect(sorted).toEqual([
      "img1.png",
      "img2.png",
      "img10.png",
    ])
  })

  it("compares case-insensitively", () => {
    expect(compareNaturalStrings("Apple", "apple")).toBe(0)
  })
})
