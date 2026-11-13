import { describe, expect, test } from "vitest"

import type {
  DeleteJobResult,
  DeleteProgress,
  DeleteSummary,
  DeleteTarget,
} from "../../deleting/deleteItems"
import {
  type DeleteDialogState,
  deleteDialogReducer,
  getDeleteProgressValue,
  hiddenDeleteDialogState,
} from "./deleteDialogState"

const targets: readonly DeleteTarget[] = [
  { filePath: "/Cats", isDirectory: true },
]

const summary: DeleteSummary = {
  fileCount: 3,
  folderCount: 0,
  isComplete: true,
  items: [],
  totalBytes: 30,
}

const result: DeleteJobResult = {
  isStopped: false,
  items: [],
}

const createProgress = (
  overrides: Partial<DeleteProgress> = {},
): DeleteProgress => ({
  currentPath: null,
  entriesDone: 0,
  entriesTotal: null,
  isStopRequested: false,
  itemCount: 1,
  itemIndex: 0,
  itemName: "Cats",
  itemPath: "/Cats",
  phase: "trashing",
  ...overrides,
})

const confirming = deleteDialogReducer(
  hiddenDeleteDialogState,
  { targets, type: "opened" },
)

const running = deleteDialogReducer(confirming, {
  jobId: "job-1",
  type: "started",
})

describe("deleteDialogReducer", () => {
  test("walks the question, the running delete, and the report", () => {
    expect(confirming).toMatchObject({
      phase: "confirming",
      summary: null,
      targets,
    })

    const summarized = deleteDialogReducer(confirming, {
      summary,
      targets,
      type: "summarized",
    })

    expect(summarized).toMatchObject({ summary })

    const started = deleteDialogReducer(summarized, {
      jobId: "job-1",
      type: "started",
    })

    expect(started).toMatchObject({
      isStopRequested: false,
      jobId: "job-1",
      phase: "running",
      summary,
    })

    const finished = deleteDialogReducer(started, {
      jobId: "job-1",
      result,
      type: "finished",
    })

    expect(finished).toEqual({
      phase: "finished",
      result,
      targets,
    })

    expect(
      deleteDialogReducer(finished, { type: "closed" }),
    ).toBe(hiddenDeleteDialogState)
  })

  test("ignores a second request while one owns the dialog", () => {
    expect(
      deleteDialogReducer(confirming, {
        targets: [{ filePath: "/Dogs", isDirectory: true }],
        type: "opened",
      }),
    ).toBe(confirming)
  })

  test("drops a summary that belongs to an earlier question", () => {
    expect(
      deleteDialogReducer(confirming, {
        summary,
        targets: [{ filePath: "/Cats", isDirectory: true }],
        type: "summarized",
      }),
    ).toBe(confirming)
  })

  test("takes progress only for its own job", () => {
    const progress = createProgress({ phase: "removing" })

    expect(
      deleteDialogReducer(running, {
        jobId: "job-1",
        progress,
        type: "progressed",
      }),
    ).toMatchObject({ progress })

    expect(
      deleteDialogReducer(running, {
        jobId: "job-0",
        progress,
        type: "progressed",
      }),
    ).toBe(running)
  })

  test("Stop marks the running delete as stopping, and only that", () => {
    const stopping = deleteDialogReducer(running, {
      type: "stopRequested",
    })

    expect(stopping).toMatchObject({
      isStopRequested: true,
      phase: "running",
    })

    expect(
      deleteDialogReducer(confirming, {
        type: "stopRequested",
      }),
    ).toBe(confirming)
  })

  test("a running delete cannot be closed away", () => {
    expect(
      deleteDialogReducer(running, { type: "closed" }),
    ).toBe(running)
  })

  test("a result for another job does not end this one", () => {
    expect(
      deleteDialogReducer(running, {
        jobId: "job-0",
        result,
        type: "finished",
      }),
    ).toBe(running)
  })

  test("progress after the report arrived is dropped", () => {
    const finished: DeleteDialogState = deleteDialogReducer(
      running,
      {
        jobId: "job-1",
        result,
        type: "finished",
      },
    )

    expect(
      deleteDialogReducer(finished, {
        jobId: "job-1",
        progress: createProgress(),
        type: "progressed",
      }),
    ).toBe(finished)
  })
})

describe("getDeleteProgressValue", () => {
  test("is indeterminate for one item while the trash works or files are listed", () => {
    expect(getDeleteProgressValue(null, 1)).toBeNull()
    expect(
      getDeleteProgressValue(createProgress(), 1),
    ).toBeNull()
    expect(
      getDeleteProgressValue(
        createProgress({ phase: "listing" }),
        1,
      ),
    ).toBeNull()
  })

  test("measures one item by the entries removed", () => {
    expect(
      getDeleteProgressValue(
        createProgress({
          entriesDone: 25,
          entriesTotal: 100,
          phase: "removing",
        }),
        1,
      ),
    ).toEqual({ max: 1, value: 0.25 })
  })

  test("measures several items by the items done plus the current one's share", () => {
    expect(getDeleteProgressValue(null, 4)).toEqual({
      max: 4,
      value: 0,
    })

    expect(
      getDeleteProgressValue(
        createProgress({ itemCount: 4, itemIndex: 2 }),
        4,
      ),
    ).toEqual({ max: 4, value: 2 })

    expect(
      getDeleteProgressValue(
        createProgress({
          entriesDone: 5,
          entriesTotal: 10,
          itemCount: 4,
          itemIndex: 1,
          phase: "removing",
        }),
        4,
      ),
    ).toEqual({ max: 4, value: 1.5 })
  })
})
