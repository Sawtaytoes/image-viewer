import { describe, expect, it } from "vitest"

import { sortOrders } from "../settings/sortOrders"
import sortDirectoryEntries from "./sortDirectoryEntries"

const entries = [
  { modifiedTime: 200, name: "banana.jpg" },
  { modifiedTime: 300, name: "apple.jpg" },
  { modifiedTime: 100, name: "cherry.jpg" },
]

describe("sortDirectoryEntries", () => {
  it("sorts by natural name for the name order", () => {
    expect(
      sortDirectoryEntries(entries, sortOrders.name).map(
        (entry) => entry.name,
      ),
    ).toEqual(["apple.jpg", "banana.jpg", "cherry.jpg"])
  })

  it("sorts newest-first for the modified-desc order", () => {
    expect(
      sortDirectoryEntries(
        entries,
        sortOrders.modifiedDesc,
      ).map((entry) => entry.name),
    ).toEqual(["apple.jpg", "banana.jpg", "cherry.jpg"])
  })

  it("breaks modified-time ties by natural name", () => {
    const sameTime = [
      { modifiedTime: 500, name: "b.jpg" },
      { modifiedTime: 500, name: "a.jpg" },
    ]

    expect(
      sortDirectoryEntries(
        sameTime,
        sortOrders.modifiedDesc,
      ).map((entry) => entry.name),
    ).toEqual(["a.jpg", "b.jpg"])
  })

  it("does not mutate the input array", () => {
    const original = entries.slice()

    sortDirectoryEntries(entries, sortOrders.modifiedDesc)

    expect(entries).toEqual(original)
  })
})
