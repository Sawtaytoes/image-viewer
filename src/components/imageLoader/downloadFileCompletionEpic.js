import { filter, map, pluck, tap } from "rxjs/operators"
import {
  finishedFilePathDownload,
  removeFilePathFromProcessingQueue,
} from "./imageLoaderActions"
import ofType from "./ofType"

const downloadFileCompletionEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType(finishedFilePathDownload.type),
    pluck("payload"),
    map(({ filePath }) => ({
      filePath,
      isProcessing: state$.value.processingQueue[filePath],
    })),
    map(
      ({ filePath, isProcessing }) =>
        isProcessing &&
        removeFilePathFromProcessingQueue({
          filePath,
        }),
    ),
    filter(Boolean),
    tap(dispatch),
  )

export default downloadFileCompletionEpic
