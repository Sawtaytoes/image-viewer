import { filter, map, pluck, tap } from "rxjs/operators"
import {
  removeFilePathFromProcessingQueue,
  stopFilePathDownload,
} from "./imageLoaderActions"
import ofType from "./ofType"

const processQueueFilePathRemovalEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType(removeFilePathFromProcessingQueue.type),
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
