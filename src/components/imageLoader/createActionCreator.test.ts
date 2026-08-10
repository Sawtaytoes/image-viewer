import { describe, expect, test } from "vitest"

import createActionCreator from "./createActionCreator"

describe("createActionCreator", () => {
  test("exposes the action type", () => {
    const doThing = createActionCreator({
      actionType: "doThing",
    })

    expect(doThing.type).toBe("doThing")
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
