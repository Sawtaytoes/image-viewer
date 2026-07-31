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
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  addDownloadedFile,
  type FilePathPayload,
  finishedFilePathDownload,
  startFilePathDownload,
  stopFilePathDownload,
  updateDownloadPercentage,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const downloadFilePathsEpic: ImageLoaderEpic = (
  action$,
  _state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      startFilePathDownload.type,
    ),
    map(({ namespace, payload }) => ({
      filePath: payload.filePath,
      namespace,
    })),
    mergeMap(({ filePath, namespace }) =>
      createFileDownloadObservable(filePath).pipe(
        takeUntil(
          action$.pipe(
            ofType<NamespaceAction<FilePathPayload>>(
              stopFilePathDownload.type,
            ),
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
