import { map, mergeAll, pluck, tap } from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  type FilePathPayload,
  removeDownloadedFile,
  removeFilePath,
  removeFilePathFromProcessingQueue,
  removeFilePathFromStandbyQueue,
  resetDownloadedPercentage,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const removeFilePathEpic: ImageLoaderEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      removeFilePath.type,
    ),
    pluck("payload"),
    tap(({ filePath }) => {
      const fileBlobUrl =
        state$.value.downloadedFiles[filePath]

      // A path with no cached blob has nothing to revoke — the untyped version
      // handed `undefined` straight to `revokeObjectURL`, which is a no-op.
      if (fileBlobUrl) {
        URL.revokeObjectURL(fileBlobUrl)
      }
    }),
    map(({ filePath }) => [
      removeFilePathFromProcessingQueue({
        filePath,
      }),
      removeFilePathFromStandbyQueue({
        filePath,
      }),
      resetDownloadedPercentage({
        filePath,
      }),
      removeDownloadedFile({
        filePath,
      }),
    ]),
    mergeAll(),
    tap(dispatch),
  )

export default removeFilePathEpic
