import { describe, expect, test } from "vitest"

import { sortOrders } from "../settings/sortOrders"
import sortDirectoryEntries from "./sortDirectoryEntries"

const entries = [
  { modifiedTime: 200, name: "banana.jpg" },
  { modifiedTime: 300, name: "apple.jpg" },
  { modifiedTime: 100, name: "cherry.jpg" },
]

describe("sortDirectoryEntries", () => {
  test("sorts by natural name for the name order", () => {
    expect(
      sortDirectoryEntries(entries, sortOrders.name).map(
        (entry) => entry.name,
      ),
    ).toEqual(["apple.jpg", "banana.jpg", "cherry.jpg"])
  })

  test("sorts newest-first for the modified-desc order", () => {
    expect(
      sortDirectoryEntries(
        entries,
        sortOrders.modifiedDesc,
      ).map((entry) => entry.name),
    ).toEqual(["apple.jpg", "banana.jpg", "cherry.jpg"])
  })

  test("breaks modified-time ties by natural name", () => {
    const sameTime = [
      { modifiedTime: 500, name: "bravo.jpg" },
      { modifiedTime: 500, name: "alpha.jpg" },
    ]

    expect(
      sortDirectoryEntries(
        sameTime,
        sortOrders.modifiedDesc,
      ).map((entry) => entry.name),
    ).toEqual(["alpha.jpg", "bravo.jpg"])
  })

  test("does not mutate the input array", () => {
    const original = entries.slice()

    sortDirectoryEntries(entries, sortOrders.modifiedDesc)

    expect(entries).toEqual(original)
  })
})
