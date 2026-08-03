import { filter, map, pluck, tap } from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  type FilePathPayload,
  finishedFilePathDownload,
  removeFilePathFromProcessingQueue,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const downloadFileCompletionEpic: ImageLoaderEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      finishedFilePathDownload.type,
    ),
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
