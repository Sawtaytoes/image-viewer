import { map, pluck, tap } from "rxjs/operators"
import {
  addFilePathToProcessingQueue,
  startFilePathDownload,
} from "./imageLoaderActions"
import ofType from "./ofType"

const downloadFileEpic = (action$, _state$, { dispatch }) =>
  action$.pipe(
    ofType(addFilePathToProcessingQueue.type),
    pluck("payload"),
    map(({ filePath }) =>
      startFilePathDownload({
        filePath,
      }),
    ),
    tap(dispatch),
  )

export default downloadFileEpic
