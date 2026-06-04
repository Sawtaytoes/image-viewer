import {
  filter,
  map,
  mergeAll,
  pluck,
  tap,
} from "rxjs/operators"
import {
  addFilePath,
  addFilePathToPriorityQueue,
  addFilePathToStandbyQueue,
  removeFilePathFromPriorityQueue,
  removeFilePathFromStandbyQueue,
} from "./imageLoaderActions"
import ofType from "./ofType"

const addFilePathEpic = (action$, state$, { dispatch }) =>
  action$.pipe(
    ofType(addFilePath.type),
    pluck("payload"),
    filter(
      ({ filePath }) =>
        !state$.value.downloadedFiles[filePath],
    ),
    map(({ filePath, ...otherProps }) => ({
      ...otherProps,
      filePath,
      isPrioritized: state$.value.priorityQueue[filePath],
      isProcessing: state$.value.processingQueue[filePath],
      isStandingBy: state$.value.standbyQueue[filePath],
    })),
    map(
      ({
        filePath,
        isPrioritized,
        isProcessing,
        isStandingBy,
        isVisible,
      }) => [
        // A hidden tile drops back to standby (deprioritized) but its in-flight
        // download is deliberately NOT cancelled: the same image is often shown
        // in several panes at once, and cancelling here would abort a download
        // the others still need. With only a couple of download slots, the old
        // cancel-on-hide thrashed — tiles were repeatedly aborted mid-download
        // and never finished. Letting a started download complete (it frees its
        // slot on finish via downloadFileCompletionEpic) keeps the cache shared.
        !isVisible &&
          isPrioritized &&
          removeFilePathFromPriorityQueue({
            filePath,
          }),
        isVisible &&
          isStandingBy &&
          removeFilePathFromStandbyQueue({
            filePath,
          }),
        isVisible &&
          !isProcessing &&
          addFilePathToPriorityQueue({
            filePath,
          }),
        !isVisible &&
          addFilePathToStandbyQueue({
            filePath,
          }),
      ],
    ),
    mergeAll(),
    filter(Boolean),
    tap(dispatch),
  )

export default addFilePathEpic
