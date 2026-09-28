import { describe, expect, test } from "vitest"

import normalizeSavedQueue from "./savedQueue"

const folder = { id: "f1", name: "Cats", path: "/Cats" }

describe("normalizeSavedQueue", () => {
  test("reads a slot saved before positions as a queue with none", () => {
    expect(normalizeSavedQueue([folder])).toEqual({
      activePaneIndex: null,
      folders: [folder],
      lastIndexByPath: {},
      panes: [],
    })
  })

  test("keeps positions and columns, and drops entries it cannot use", () => {
    expect(
      normalizeSavedQueue({
        activePaneIndex: 1,
        folders: [folder, { id: 3 }],
        lastIndexByPath: { "/Cats": 5, "/Dogs": -1 },
        panes: [
          { currentIndex: 5, folderPath: "/Cats" },
          { currentIndex: 0, folderPath: null },
          { currentIndex: "x", folderPath: "/Dogs" },
        ],
      }),
    ).toEqual({
      activePaneIndex: 1,
      folders: [folder],
      lastIndexByPath: { "/Cats": 5 },
      panes: [
        { currentIndex: 5, folderPath: "/Cats" },
        { currentIndex: 0, folderPath: null },
      ],
    })
  })

  test("drops an active column that is out of range", () => {
    expect(
      normalizeSavedQueue({
        activePaneIndex: 4,
        folders: [folder],
        panes: [],
      })?.activePaneIndex,
    ).toBeNull()
  })

  test("reads anything else as no slot", () => {
    expect(normalizeSavedQueue(null)).toBeNull()
    expect(normalizeSavedQueue({ panes: [] })).toBeNull()
    expect(normalizeSavedQueue("queue")).toBeNull()
  })
})
