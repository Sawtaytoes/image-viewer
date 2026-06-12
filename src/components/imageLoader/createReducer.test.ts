import { describe, expect, it } from "vitest"

import createReducer from "./createReducer"

describe("createReducer", () => {
  const reducer = createReducer(
    { increment: (state) => state + 1 },
    0,
  )

  it("falls back to the initial state", () => {
    expect(reducer(undefined, { type: "noop" })).toBe(0)
  })

  it("runs the handler for a matching action type", () => {
    expect(reducer(5, { type: "increment" })).toBe(6)
  })

  it("returns the current state for unknown action types", () => {
    expect(reducer(5, { type: "unknown" })).toBe(5)
  })
})
