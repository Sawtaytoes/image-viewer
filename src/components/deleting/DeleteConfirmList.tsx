import type {
  DeleteSummary,
  DeleteTarget,
} from "../../deleting/deleteItems"
import {
  describeIncompleteCount,
  describeSummaryItem,
  describeSummaryTotal,
  formatCount,
  getTrashNote,
} from "./deleteItemsText"

// Past this many, the list names the first few and counts the rest, so a
// selection of hundreds of folders does not become a wall of names.
const visibleTargetLimit = 50

// The question's body: every item by name, with what it holds, and the total.
const DeleteConfirmList = ({
  getName,
  summary,
  summaryErrorMessage,
  targets,
  trashName,
}: {
  getName: (filePath: string) => string
  summary: DeleteSummary | null
  summaryErrorMessage: string | null
  targets: readonly DeleteTarget[]
  trashName: string
}) => {
  const hiddenTargetCount = Math.max(
    0,
    targets.length - visibleTargetLimit,
  )

  return (
    <div className="flex animate-fade-in flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {targets
          .slice(0, visibleTargetLimit)
          .map((target, targetIndex) => {
            const summaryItem = summary?.items[targetIndex]

            return (
              <li
                className="flex flex-col"
                key={target.filePath}
              >
                <span className="break-all font-semibold text-content-primary text-lg">
                  {getName(target.filePath)}
                </span>

                <span className="text-content-secondary text-sm">
                  {target.isDirectory ? "Folder" : "File"}
                  {" · "}
                  {summaryItem
                    ? describeSummaryItem(summaryItem)
                    : summaryErrorMessage === null
                      ? "Counting…"
                      : "Not counted"}
                </span>
              </li>
            )
          })}

        {hiddenTargetCount > 0 && (
          <li className="text-content-secondary text-sm">
            And{" "}
            {formatCount(hiddenTargetCount, "more item")}
          </li>
        )}
      </ul>

      {summary &&
        (targets.length > 1 ||
          summary.items.some(
            ({ isDirectory }) => isDirectory,
          )) && (
          <p className="font-semibold text-content-primary text-md">
            {describeSummaryTotal(summary)}
          </p>
        )}

      {summary && !summary.isComplete && (
        <p className="text-content-secondary text-sm">
          {describeIncompleteCount(targets)}
        </p>
      )}

      {summaryErrorMessage !== null && (
        <p className="text-content-secondary text-sm">
          Could not count what these hold:{" "}
          {summaryErrorMessage}
        </p>
      )}

      <p className="text-content-secondary text-sm">
        {getTrashNote(trashName)}
      </p>
    </div>
  )
}

export default DeleteConfirmList
