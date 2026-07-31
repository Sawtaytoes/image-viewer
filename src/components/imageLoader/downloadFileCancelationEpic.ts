import { filter, map, pluck, tap } from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  type FilePathPayload,
  resetDownloadedPercentage,
  stopFilePathDownload,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const downloadFileCancelationEpic: ImageLoaderEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      stopFilePathDownload.type,
    ),
    pluck("payload"),
    map(({ filePath }) => ({
      downloadPercentage:
        state$.value.downloadPercentages[filePath],
      filePath,
    })),
    map(
      ({ downloadPercentage, filePath }) =>
        typeof downloadPercentage === "number" &&
        resetDownloadedPercentage({
          downloadPercentage,
          filePath,
        }),
    ),
    filter(Boolean),
    tap(dispatch),
  )

export default downloadFileCancelationEpic
