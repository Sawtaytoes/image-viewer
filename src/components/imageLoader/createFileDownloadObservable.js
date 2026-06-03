import { Observable } from "rxjs"

// Reads an image straight off disk through the preload bridge
// (`window.api.readImageData`) instead of the old XHR-over-custom-scheme path,
// which was fragile on Windows (non-standard scheme + spaces/backslashes in the
// URL, status === 0 from the custom scheme, missing Content-Type). Local disk
// reads are effectively instant, so there's no mid-download progress to report —
// we emit 100% up front to clear the loading bar, then the decoded bytes.
const createFileDownloadObservable = (filePath) =>
  new Observable((observer) => {
    let isCanceled = false

    window.api
      .readImageData(filePath)
      .then(({ data, mimeType }) => {
        if (isCanceled) {
          return
        }

        observer.next({
          downloadPercentage: 100,
          filePath,
        })

        observer.next({
          fileBlob: new Blob([data], { type: mimeType }),
        })

        observer.complete()
      })
      .catch((error) => {
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
