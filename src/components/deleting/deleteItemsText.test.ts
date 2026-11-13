import { describe, expect, test } from "vitest"

import type { DeleteItemResult } from "../../deleting/deleteItems"
import {
  describeOutcome,
  describeProgress,
  describeSummaryItem,
  describeSummaryTotal,
  formatByteSize,
  getConfirmHeading,
  getReportHeading,
  getTrashName,
} from "./deleteItemsText"

const getName = (filePath: string) =>
  filePath.split("/").at(-1) ?? filePath

const createItem = (
  overrides: Partial<DeleteItemResult>,
): DeleteItemResult => ({
  entriesRemoved: 0,
  entriesTotal: null,
  errorMessage: null,
  filePath: "/Cats",
  isDirectory: true,
  name: "Cats",
  outcome: "movedToTrash",
  trashErrorMessage: null,
  ...overrides,
})

describe("formatByteSize", () => {
  test.each([
    [0, "0 bytes"],
    [1, "1 byte"],
    [1023, "1,023 bytes"],
    [1536, "1.5 KB"],
    [45 * 1024 * 1024, "45 MB"],
    [1.25 * 1024 ** 3, "1.3 GB"],
  ])("formats %d bytes as %s", (byteCount, text) => {
    expect(formatByteSize(byteCount)).toBe(text)
  })
})

describe("the question", () => {
  test("names a single folder or file", () => {
    expect(
      getConfirmHeading(
        [{ filePath: "/Cats", isDirectory: true }],
        getName,
      ),
    ).toBe("Delete the folder “Cats”?")

    expect(
      getConfirmHeading(
        [{ filePath: "/a.jpg", isDirectory: false }],
        getName,
      ),
    ).toBe("Delete the file “a.jpg”?")
  })

  test("counts several", () => {
    expect(
      getConfirmHeading(
        [
          { filePath: "/Cats", isDirectory: true },
          { filePath: "/Dogs", isDirectory: true },
        ],
        getName,
      ),
    ).toBe("Delete these 2 folders?")

    expect(
      getConfirmHeading(
        [
          { filePath: "/Cats", isDirectory: true },
          { filePath: "/a.jpg", isDirectory: false },
        ],
        getName,
      ),
    ).toBe("Delete these 2 items?")
  })

  test("describes what a folder holds, and says when counting stopped early", () => {
    const item = {
      errorMessage: null,
      fileCount: 1204,
      filePath: "/Cats",
      folderCount: 3,
      isComplete: true,
      isDirectory: true,
      name: "Cats",
      totalBytes: 45 * 1024 * 1024,
    }

    expect(describeSummaryItem(item)).toBe(
      "1,204 files, 3 folders, 45 MB",
    )
    expect(
      describeSummaryItem({ ...item, isComplete: false }),
    ).toBe("at least 1,204 files, 3 folders, 45 MB")
    expect(
      describeSummaryItem({
        ...item,
        fileCount: 0,
        folderCount: 0,
      }),
    ).toBe("Empty folder")
  })

  test("totals the folders picked plus the folders inside them", () => {
    expect(
      describeSummaryTotal({
        fileCount: 10,
        folderCount: 2,
        isComplete: true,
        items: [
          {
            errorMessage: null,
            fileCount: 10,
            filePath: "/Cats",
            folderCount: 2,
            isComplete: true,
            isDirectory: true,
            name: "Cats",
            totalBytes: 2048,
          },
        ],
        totalBytes: 2048,
      }),
    ).toBe("In all: 10 files and 3 folders, 2.0 KB.")
  })
})

describe("progress and the report", () => {
  test("says which path the delete is on", () => {
    expect(describeProgress(null, "Recycle Bin")).toBe(
      "Starting…",
    )

    const progress = {
      currentPath: "/Cats/a.jpg",
      entriesDone: 120,
      entriesTotal: 4302,
      isStopRequested: false,
      itemCount: 1,
      itemIndex: 0,
      itemName: "Cats",
      itemPath: "/Cats",
      phase: "removing" as const,
    }

    expect(describeProgress(progress, "Recycle Bin")).toBe(
      "Deleting permanently: 120 of 4,302 files and folders removed.",
    )
    expect(
      describeProgress(
        { ...progress, phase: "trashing" },
        "Recycle Bin",
      ),
    ).toBe("Moving to the Recycle Bin…")
  })

  test("says how each item was removed, or why it was not", () => {
    expect(
      describeOutcome(createItem({}), "Recycle Bin"),
    ).toBe("Moved to the Recycle Bin.")

    expect(
      describeOutcome(
        createItem({
          outcome: "deletedPermanently",
          trashErrorMessage: "no recycle bin",
        }),
        "Recycle Bin",
      ),
    ).toBe(
      "Deleted permanently, because the Recycle Bin was not available here.",
    )

    expect(
      describeOutcome(
        createItem({
          entriesRemoved: 12,
          entriesTotal: 40,
          outcome: "partlyDeleted",
        }),
        "Recycle Bin",
      ),
    ).toBe(
      "Stopped partway: 12 of 40 files and folders were deleted permanently. The rest are still there.",
    )

    expect(
      describeOutcome(
        createItem({ outcome: "notDeleted" }),
        "Recycle Bin",
      ),
    ).toBe("Not deleted. It is unchanged.")
  })

  test("heads the report with what happened overall", () => {
    expect(
      getReportHeading({
        isStopped: false,
        items: [createItem({})],
      }),
    ).toBe("Deleted “Cats”")

    expect(
      getReportHeading({
        isStopped: true,
        items: [
          createItem({}),
          createItem({
            filePath: "/Dogs",
            outcome: "notDeleted",
          }),
        ],
      }),
    ).toBe("Delete stopped: 1 of 2 items deleted")

    expect(
      getReportHeading({
        isStopped: false,
        items: [createItem({ outcome: "failed" })],
      }),
    ).toBe("Could not delete “Cats”")
  })

  test("calls the trash by its Windows name on Windows", () => {
    expect(getTrashName("win32")).toBe("Recycle Bin")
    expect(getTrashName("linux")).toBe("trash")
  })
})
