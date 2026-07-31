import { filter, map, pluck, tap } from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  type FilePathPayload,
  removeFilePathFromProcessingQueue,
  stopFilePathDownload,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const processQueueFilePathRemovalEpic: ImageLoaderEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      removeFilePathFromProcessingQueue.type,
    ),
    pluck("payload"),
    map(({ filePath }) => ({
      filePath,
      isDownloaded: state$.value.downloadedFiles[filePath],
    })),
    map(
      ({ filePath, isDownloaded }) =>
        !isDownloaded &&
        stopFilePathDownload({
          filePath,
        }),
    ),
    filter(Boolean),
    tap(dispatch),
  )

export default processQueueFilePathRemovalEpic
