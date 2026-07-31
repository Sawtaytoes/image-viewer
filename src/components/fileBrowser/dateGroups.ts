// Windows File Explorer's "group by Date modified" buckets, in the order
// Explorer shows them (most recent first). An entry lands in the first bucket
// whose threshold it clears, so the week buckets take precedence over the month
// buckets when a week straddles a month boundary — matching Explorer.
//
// Week boundaries assume Sunday as the first day of the week (the en-US default
// this app targets).

const dateGroupLabels = {
  earlierThisMonth: "Earlier this month",
  earlierThisWeek: "Earlier this week",
  earlierThisYear: "Earlier this year",
  lastMonth: "Last month",
  lastWeek: "Last week",
  longAgo: "A long time ago",
  today: "Today",
  yesterday: "Yesterday",
}

// One of the eight Explorer buckets, derived from the label map so a new bucket
// cannot be added in one place and forgotten in the other.
export type DateGroupKey = keyof typeof dateGroupLabels

// Most-recent-first display order.
const orderedDateGroupKeys: readonly DateGroupKey[] = [
  "today",
  "yesterday",
  "earlierThisWeek",
  "lastWeek",
  "earlierThisMonth",
  "lastMonth",
  "earlierThisYear",
  "longAgo",
]

// The epoch-ms thresholds a mtime is compared against. Not one per bucket:
// `earlierThisWeek` is bounded by `weekStart` and `longAgo` is the fallthrough,
// so those two have no threshold of their own.
export interface DateGroupBoundaries {
  earlierThisMonth: number
  earlierThisYear: number
  lastMonth: number
  lastWeek: number
  today: number
  weekStart: number
  yesterday: number
}

// One rendered bucket. Generic over the entry so the caller's own shape (which
// carries a `kind`, a `path`, …) survives the grouping.
export interface DateGroup<EntryType> {
  items: EntryType[]
  key: DateGroupKey
  label: string
}

const millisecondsPerDay = 24 * 60 * 60 * 1000

const startOfDay = (date: Date): number =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()

// All thresholds (epoch ms) derived from a single "now" so the buckets line up
// with one consistent moment.
const getDateGroupBoundaries = (
  now: number,
): DateGroupBoundaries => {
  const nowDate = new Date(now)

  const todayStart = startOfDay(nowDate)

  const weekStart =
    todayStart - nowDate.getDay() * millisecondsPerDay

  return {
    earlierThisMonth: new Date(
      nowDate.getFullYear(),
      nowDate.getMonth(),
      1,
    ).getTime(),
    earlierThisYear: new Date(
      nowDate.getFullYear(),
      0,
      1,
    ).getTime(),
    lastMonth: new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() - 1,
      1,
    ).getTime(),
    lastWeek: weekStart - 7 * millisecondsPerDay,
    today: todayStart,
    weekStart,
    yesterday: todayStart - millisecondsPerDay,
  }
}

const getDateGroupKey = (
  modifiedTime: number | undefined,
  boundaries: DateGroupBoundaries,
): DateGroupKey => {
  const time = modifiedTime ?? 0

  if (time >= boundaries.today) {
    return "today"
  }

  if (time >= boundaries.yesterday) {
    return "yesterday"
  }

  if (time >= boundaries.weekStart) {
    return "earlierThisWeek"
  }

  if (time >= boundaries.lastWeek) {
    return "lastWeek"
  }

  if (time >= boundaries.earlierThisMonth) {
    return "earlierThisMonth"
  }

  if (time >= boundaries.lastMonth) {
    return "lastMonth"
  }

  if (time >= boundaries.earlierThisYear) {
    return "earlierThisYear"
  }

  return "longAgo"
}

// Group already-sorted (newest-first) entries into the non-empty buckets, in
// Explorer's display order. Each group is `{ key, label, items }`.
const groupEntriesByDate = <
  EntryType extends { modifiedTime?: number },
>(
  entries: readonly EntryType[],
  now: number = Date.now(),
): DateGroup<EntryType>[] => {
  const boundaries = getDateGroupBoundaries(now)

  const itemsByKey = new Map<DateGroupKey, EntryType[]>()

  entries.forEach((entry) => {
    const key = getDateGroupKey(
      entry.modifiedTime,
      boundaries,
    )

    const items = itemsByKey.get(key)

    if (items) {
      items.push(entry)
    } else {
      itemsByKey.set(key, [entry])
    }
  })

  return orderedDateGroupKeys
    .filter((key) => itemsByKey.has(key))
    .map((key) => ({
      items: itemsByKey.get(key) ?? [],
      key,
      label: dateGroupLabels[key],
    }))
}

export {
  dateGroupLabels,
  getDateGroupBoundaries,
  getDateGroupKey,
  groupEntriesByDate,
  orderedDateGroupKeys,
}

export default groupEntriesByDate
