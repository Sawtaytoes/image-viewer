import {
  endWith,
  filter,
  map,
  mergeAll,
  mergeMap,
  pluck,
  takeUntil,
  tap,
} from "rxjs/operators"

import createFileDownloadObservable from "./createFileDownloadObservable"
import {
  addDownloadedFile,
  finishedFilePathDownload,
  startFilePathDownload,
  stopFilePathDownload,
  updateDownloadPercentage,
} from "./imageLoaderActions"
import ofType from "./ofType"

const downloadFilePathsEpic = (
  action$,
  _state$,
  { dispatch },
) =>
  action$.pipe(
    ofType(startFilePathDownload.type),
    map(({ namespace, payload }) => ({
      filePath: payload.filePath,
      namespace,
    })),
    mergeMap(({ filePath, namespace }) =>
      createFileDownloadObservable(filePath).pipe(
        takeUntil(
          action$.pipe(
            ofType(stopFilePathDownload.type),
            pluck("namespace"),
            filter(
              (expectedNamespace) =>
                expectedNamespace === namespace,
            ),
          ),
        ),
        map(({ downloadPercentage, fileBlob }) => [
          typeof downloadPercentage === "number" &&
            updateDownloadPercentage({
              downloadPercentage,
              filePath,
            }),
          fileBlob &&
            addDownloadedFile({
              fileBlob,
              fileBlobUrl: URL.createObjectURL(fileBlob),
              filePath,
            }),
        ]),
        mergeAll(),
        filter(Boolean),
        endWith(
          finishedFilePathDownload({
            filePath,
          }),
        ),
        tap(dispatch),
      ),
    ),
  )

export default downloadFilePathsEpic
