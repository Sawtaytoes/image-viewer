import { map, pluck, tap } from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  type FilePathPayload,
  removeDownloadedFile,
  removeImageDomElement,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const imageDomElementCleanupEpic: ImageLoaderEpic = (
  action$,
  _state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<FilePathPayload>>(
      removeDownloadedFile.type,
    ),
    pluck("payload"),
    map(({ filePath }) =>
      removeImageDomElement({
        filePath,
      }),
    ),
    tap(dispatch),
  )

export default imageDomElementCleanupEpic
