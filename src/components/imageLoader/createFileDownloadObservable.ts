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
const createFileDownloadObservable = (filePath: string) =>
  new Observable<FileDownloadUpdate>((observer) => {
    let isCanceled = false

    window.api
      .readImageData(filePath, (downloadPercentage) => {
        if (isCanceled) {
          return
        }

        observer.next({
          downloadPercentage,
          filePath,
        })
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
    }
  })

export default createFileDownloadObservable
