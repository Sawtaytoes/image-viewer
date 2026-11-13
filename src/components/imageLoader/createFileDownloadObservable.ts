import { Observable } from "rxjs"

// One step of a file download. Emissions carry different halves — a progress
// tick names the path it is reporting on (many may arrive as bytes stream in),
// the final completion carries the decoded blob — so both fields are optional
// and `downloadFilePathsEpic` branches on which one arrived.
export interface FileDownloadUpdate {
  downloadPercentage?: number
  fileBlob?: Blob
  filePath?: string
}

// Reads an image straight off disk through the preload bridge
// (`window.api.readImageData`) instead of the old XHR-over-custom-scheme path,
// which was fragile on Windows (non-standard scheme + spaces/backslashes in the
// URL, status === 0 from the custom scheme, missing Content-Type). The preload
// streams the read in chunks and calls `onProgress` with a byte-level percent,
// so the loading bar advances for large files exactly as the old XHR `progress`
// events made it — small files read in one chunk and jump straight to 100.
//
// Unsubscribing means no view holds the image any more (its folder or pane
// closed), so the read is canceled through `window.api.cancelReadImageData`.
// For a HEIC that drops its decode in main, which is the slow part. A tile that
// only scrolls out of view keeps its download; see
// docs/decisions/2026-06-04-dont-cancel-in-flight-downloads-on-hide.md.
//
// The ids carry a token for this page load, so a read after a reload never
// reuses an id main may still be tracking from before it.
const pageLoadToken = Math.random().toString(36).slice(2)

let readCount = 0

const createFileDownloadObservable = (filePath: string) =>
  new Observable<FileDownloadUpdate>((observer) => {
    readCount += 1

    const requestId = `image-read-${pageLoadToken}-${readCount}`

    let isCanceled = false
    let isSettled = false

    window.api
      .readImageData(
        filePath,
        (downloadPercentage) => {
          if (isCanceled) {
            return
          }

          observer.next({
            downloadPercentage,
            filePath,
          })
        },
        requestId,
      )
      .finally(() => {
        isSettled = true
      })
      .then(({ data, mimeType }) => {
        if (isCanceled) {
          return
        }

        // Belt-and-suspenders: a single-chunk read only ever fires 100 through
        // `onProgress`, and a 0-byte file fires nothing — emit the final 100
        // here so the bar always reaches complete before the blob lands.
        observer.next({
          downloadPercentage: 100,
          filePath,
        })

        observer.next({
          fileBlob: new Blob([data], { type: mimeType }),
        })

        observer.complete()
      })
      .catch((error: Error) => {
        if (isCanceled) {
          return
        }

        // Don't surface the error into the epic stream (that would tear down
        // every future download). Complete quietly so the file leaves the
        // processing queue and the next one starts.
        console.error(
          "Failed to read image",
          filePath,
          error,
        )

        observer.complete()
      })

    return () => {
      isCanceled = true

      if (!isSettled) {
        window.api.cancelReadImageData(requestId)
      }
    }
  })

export default createFileDownloadObservable
