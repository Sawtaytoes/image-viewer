import type { DeleteJobResult } from "../../deleting/deleteItems"
import { describeOutcome } from "./deleteItemsText"

// The report: each item, and what happened to it — moved to the trash,
// deleted permanently, stopped partway, untouched, or failed.
const DeleteReportList = ({
  result,
  trashName,
}: {
  result: DeleteJobResult
  trashName: string
}) => (
  <ul className="flex animate-fade-in flex-col gap-2">
    {result.items.map((item) => (
      <li className="flex flex-col" key={item.filePath}>
        <span className="break-all font-semibold text-content-primary text-lg">
          {item.name}
        </span>

        <span
          className={
            item.outcome === "failed" ||
            item.outcome === "partlyDeleted"
              ? "text-intent-danger-content text-sm"
              : "text-content-secondary text-sm"
          }
        >
          {describeOutcome(item, trashName)}
        </span>
      </li>
    ))}
  </ul>
)

export default DeleteReportList
