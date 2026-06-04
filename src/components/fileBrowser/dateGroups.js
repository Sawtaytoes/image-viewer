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

// Most-recent-first display order.
const orderedDateGroupKeys = [
  "today",
  "yesterday",
  "earlierThisWeek",
  "lastWeek",
  "earlierThisMonth",
  "lastMonth",
  "earlierThisYear",
  "longAgo",
]

const millisecondsPerDay = 24 * 60 * 60 * 1000

const startOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()

// All thresholds (epoch ms) derived from a single "now" so the buckets line up
// with one consistent moment.
const getDateGroupBoundaries = (now) => {
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

const getDateGroupKey = (modifiedTime, boundaries) => {
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
const groupEntriesByDate = (entries, now = Date.now()) => {
  const boundaries = getDateGroupBoundaries(now)

  const itemsByKey = new Map()

  entries.forEach((entry) => {
    const key = getDateGroupKey(
      entry.modifiedTime,
      boundaries,
    )

    if (!itemsByKey.has(key)) {
      itemsByKey.set(key, [])
    }

    itemsByKey.get(key).push(entry)
  })

  return orderedDateGroupKeys
    .filter((key) => itemsByKey.has(key))
    .map((key) => ({
      items: itemsByKey.get(key),
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
