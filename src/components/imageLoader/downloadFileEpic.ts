import { map, pluck, tap } from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  addFilePathToProcessingQueue,
  type FilePathPayload,
  startFilePathDownload,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const downloadFileEpic: ImageLoaderEpic = (
  action$,
  _state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      addFilePathToProcessingQueue.type,
    ),
    pluck("payload"),
    map(({ filePath }) =>
      startFilePathDownload({
        filePath,
      }),
    ),
    tap(dispatch),
  )

export default downloadFileEpic
