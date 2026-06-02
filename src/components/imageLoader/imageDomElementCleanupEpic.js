import { map, pluck, tap } from "rxjs/operators"
import {
  removeDownloadedFile,
  removeImageDomElement,
} from "./imageLoaderActions"
import ofType from "./ofType"

const imageDomElementCleanupEpic = (
  action$,
  _state$,
  { dispatch },
) =>
  action$.pipe(
    ofType(removeDownloadedFile.type),
    pluck("payload"),
    map(({ filePath }) =>
      removeImageDomElement({
        filePath,
      }),
    ),
    tap(dispatch),
  )

export default imageDomElementCleanupEpic
