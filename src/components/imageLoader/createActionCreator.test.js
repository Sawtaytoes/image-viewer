import { describe, expect, it } from "vitest"

import createActionCreator from "./createActionCreator"

describe("createActionCreator", () => {
  it("exposes the action type", () => {
    const doThing = createActionCreator({
      actionType: "doThing",
    })

    expect(doThing.type).toBe("doThing")
  })

  it("builds a { payload, type } action", () => {
    const doThing = createActionCreator({
      actionType: "doThing",
    })

    expect(doThing({ value: 1 })).toEqual({
      payload: { value: 1 },
      type: "doThing",
    })
  })
})
