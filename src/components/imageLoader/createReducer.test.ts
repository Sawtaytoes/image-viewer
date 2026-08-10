import { describe, expect, test } from "vitest"

import createReducer from "./createReducer"

describe("createReducer", () => {
  const reducer = createReducer(
    { increment: (state) => state + 1 },
    0,
  )

  test("falls back to the initial state", () => {
    expect(reducer(undefined, { type: "noop" })).toBe(0)
  })

  test("runs the handler for a matching action type", () => {
    expect(reducer(5, { type: "increment" })).toBe(6)
  })

  test("returns the current state for unknown action types", () => {
    expect(reducer(5, { type: "unknown" })).toBe(5)
  })
})
