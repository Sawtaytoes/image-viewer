import { fromEvent } from "rxjs"
import {
  filter,
  map,
  mapTo,
  mergeMap,
  pluck,
  take,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { NamespaceAction } from "./createNamespaceActionCreator"
import {
  addDownloadedFile,
  addImageDomElement,
  type DownloadedFilePayload,
  type FilePathPayload,
  removeImageDomElement,
} from "./imageLoaderActions"
import ofType from "./ofType"
import type { ImageLoaderEpic } from "./reduxObservable"

const imageDomElementLoaderEpic: ImageLoaderEpic = (
  action$,
  _state$,
  { dispatch },
) =>
  action$.pipe(
    ofType<NamespaceAction<DownloadedFilePayload>>(
      addDownloadedFile.type,
    ),
    pluck("payload"),
    map(({ fileBlobUrl, filePath }) => {
      const imageDomElement = document.createElement("img")

      imageDomElement.setAttribute("src", fileBlobUrl)

      return {
        filePath,
        imageDomElement,
      }
    }),
    mergeMap(({ filePath, imageDomElement }) =>
      fromEvent(imageDomElement, "load").pipe(
        takeUntil(
          action$.pipe(
            ofType<NamespaceAction<FilePathPayload>>(
              removeImageDomElement.type,
            ),
            filter(
              ({ namespace }) => namespace === filePath,
            ),
          ),
        ),
        take(1),
        mapTo(
          addImageDomElement({
            filePath,
            imageDomElement,
          }),
        ),
      ),
    ),
    tap(dispatch),
  )

export default imageDomElementLoaderEpic
