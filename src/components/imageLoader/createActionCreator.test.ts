import { describe, expect, test } from "vitest"

import createActionCreator from "./createActionCreator"

describe("createActionCreator", () => {
  test("exposes the action type", () => {
    const doThing = createActionCreator({
      actionType: "doThing",
    })

    expect(doThing.type).toBe("doThing")
  })

  // The `ActionCreator` interface promises this, and nothing asserted it: the
  // old `.prototype.toString` assignment never affected how the function
  // stringifies, so `${doThing}` was the source text for years.
  test("stringifies to the action type", () => {
    const doThing = createActionCreator({
      actionType: "doThing",
    })

    expect(`${doThing}`).toBe("doThing")
    expect(Object.keys({ [`${doThing}`]: 1 })).toEqual([
      "doThing",
    ])
  })

  test("builds a { payload, type } action", () => {
    const doThing = createActionCreator({
      actionType: "doThing",
    })

    expect(doThing({ value: 1 })).toEqual({
      payload: { value: 1 },
      type: "doThing",
    })
  })
})
