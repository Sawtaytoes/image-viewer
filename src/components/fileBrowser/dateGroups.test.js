import { describe, expect, it } from "vitest"

import {
  getDateGroupBoundaries,
  getDateGroupKey,
  groupEntriesByDate,
} from "./dateGroups"

const millisecondsPerDay = 24 * 60 * 60 * 1000

// 2026-06-17 is a Wednesday (getDay() === 3), so the week buckets land on
// distinct calendar days from the month buckets — every Explorer bucket gets a
// representative entry.
const now = new Date(2026, 5, 17, 12, 0, 0).getTime()

const daysAgo = (days) => now - days * millisecondsPerDay

describe("getDateGroupKey", () => {
  const boundaries = getDateGroupBoundaries(now)

  it("assigns each offset to the matching Explorer bucket", () => {
    expect(getDateGroupKey(daysAgo(0), boundaries)).toBe(
      "today",
    )
    expect(getDateGroupKey(daysAgo(1), boundaries)).toBe(
      "yesterday",
    )
    expect(getDateGroupKey(daysAgo(2), boundaries)).toBe(
      "earlierThisWeek",
    )
    expect(getDateGroupKey(daysAgo(4), boundaries)).toBe(
      "lastWeek",
    )
    expect(getDateGroupKey(daysAgo(12), boundaries)).toBe(
      "earlierThisMonth",
    )
    expect(getDateGroupKey(daysAgo(40), boundaries)).toBe(
      "lastMonth",
    )
    expect(getDateGroupKey(daysAgo(120), boundaries)).toBe(
      "earlierThisYear",
    )
    expect(getDateGroupKey(daysAgo(500), boundaries)).toBe(
      "longAgo",
    )
  })

  it("treats a missing/zero mtime as the oldest bucket", () => {
    expect(getDateGroupKey(0, boundaries)).toBe("longAgo")
    expect(getDateGroupKey(undefined, boundaries)).toBe(
      "longAgo",
    )
  })

  it("puts a future time in today", () => {
    expect(getDateGroupKey(daysAgo(-1), boundaries)).toBe(
      "today",
    )
  })
})

describe("groupEntriesByDate", () => {
  it("returns only non-empty buckets in Explorer's display order", () => {
    const entries = [
      { modifiedTime: daysAgo(0), name: "a" },
      { modifiedTime: daysAgo(4), name: "b" },
      { modifiedTime: daysAgo(500), name: "c" },
    ]

    const groups = groupEntriesByDate(entries, now)

    expect(groups.map((group) => group.key)).toEqual([
      "today",
      "lastWeek",
      "longAgo",
    ])
    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Last week",
      "A long time ago",
    ])
  })

  it("collects every entry that falls in the same bucket", () => {
    const entries = [
      { modifiedTime: daysAgo(0), name: "a" },
      { modifiedTime: daysAgo(0), name: "b" },
      { modifiedTime: daysAgo(40), name: "c" },
    ]

    const groups = groupEntriesByDate(entries, now)

    expect(groups).toHaveLength(2)
    expect(
      groups[0].items.map((item) => item.name),
    ).toEqual(["a", "b"])
    expect(groups[1].key).toBe("lastMonth")
  })
})
