import { describe, expect, test } from "vitest"

import getTapPoint from "./getTapPoint"

describe(getTapPoint.name, () => {
  test("returns the pointer position for a pointer click", () => {
    expect(
      getTapPoint({ clientX: 120, clientY: 45, detail: 1 }),
    ).toEqual({ x: 120, y: 45 })
  })

  test("returns nothing for a keyboard click", () => {
    expect(
      getTapPoint({ clientX: 0, clientY: 0, detail: 0 }),
    ).toBeUndefined()
  })
})
