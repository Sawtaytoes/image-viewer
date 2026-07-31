import createActionCreator from "./createActionCreator"
import createNamespaceActionCreator, {
  type NamespaceAction,
} from "./createNamespaceActionCreator"

// Every action in this store is keyed by a file path: it is both the payload
// field the epics read and the namespace the slice maps are keyed by.
export interface FilePathPayload {
  filePath: string
}

// `addFilePath` — a tile reporting whether it is on screen, which is what
// drives the priority/standby queues.
export interface VisibilityPayload extends FilePathPayload {
  isVisible: boolean
}

// `addDownloadedFile` — the decoded bytes plus the object URL minted for them.
// Both ride along so `removeFilePath` can revoke the URL later.
export interface DownloadedFilePayload
  extends FilePathPayload {
  fileBlob: Blob
  fileBlobUrl: string
}

// `addImageDomElement` — the single `<img>` node the loader decodes into and
// hands to whichever pane displays the path.
export interface ImageDomElementPayload
  extends FilePathPayload {
  imageDomElement: HTMLImageElement
}

// `updateDownloadPercentage` — progress for the loading bar.
export interface DownloadPercentagePayload
  extends FilePathPayload {
  downloadPercentage: number
}

// `resetDownloadedPercentage` — dispatched both from the cancelation epic
// (which knows the percentage it is clearing) and from `removeFilePathEpic`
// (which does not), so the percentage is optional here.
export interface ResetDownloadPercentagePayload
  extends FilePathPayload {
  downloadPercentage?: number
}

// `addFilePathToQueue` — the only payload naming a `queueStates` value.
export interface QueueStatePayload extends FilePathPayload {
  queueState: string
}

// The probe action `createNamespaceReducerCreator` uses to read a reducer's
// initial state carries no fields at all; no reducer handles its type.
export type EmptyPayload = Record<string, never>

// Every payload that travels this store's action stream.
export type ImageLoaderPayload =
  | DownloadPercentagePayload
  | DownloadedFilePayload
  | EmptyPayload
  | FilePathPayload
  | ImageDomElementPayload
  | QueueStatePayload
  | ResetDownloadPercentagePayload
  | VisibilityPayload

// The store-wide action type: what `action$` carries, what every reducer is
// handed, and what `dispatchReduxAction` accepts. Epics narrow it back down to
// a specific payload with `ofType`.
export type ImageLoaderAction =
  NamespaceAction<ImageLoaderPayload>

export const addDownloadedFile =
  createNamespaceActionCreator<
    DownloadedFilePayload,
    "filePath"
  >({
    actionType: "addDownloadedFile",
    namespaceIdentifier: "filePath",
  })

export const addFilePath =
  createActionCreator<VisibilityPayload>({
    actionType: "addFilePath",
  })

export const addFilePathToQueue =
  createNamespaceActionCreator<QueueStatePayload>({
    actionType: "addFilePathToQueue",
  })

export const addFilePathToPriorityQueue =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "addFilePathToPriorityQueue",
      namespaceIdentifier: "filePath",
    },
  )

export const addFilePathToProcessingQueue =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "addFilePathToProcessingQueue",
      namespaceIdentifier: "filePath",
    },
  )

export const addFilePathToStandbyQueue =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "addFilePathToStandbyQueue",
      namespaceIdentifier: "filePath",
    },
  )

export const addImageDomElement =
  createNamespaceActionCreator<
    ImageDomElementPayload,
    "filePath"
  >({
    actionType: "addImageDomElement",
    namespaceIdentifier: "filePath",
  })

export const finishedFilePathDownload =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "finishedFilePathDownload",
      namespaceIdentifier: "filePath",
    },
  )

export const removeDownloadedFile =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "removeDownloadedFile",
      namespaceIdentifier: "filePath",
    },
  )

export const removeFilePath =
  createActionCreator<FilePathPayload>({
    actionType: "removeFilePath",
  })

export const removeFilePathFromQueue =
  createNamespaceActionCreator<FilePathPayload>({
    actionType: "removeFilePathFromQueue",
  })

export const removeFilePathFromPriorityQueue =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "removeFilePathFromPriorityQueue",
      namespaceIdentifier: "filePath",
    },
  )

export const removeFilePathFromProcessingQueue =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "removeFilePathFromProcessingQueue",
      namespaceIdentifier: "filePath",
    },
  )

export const removeFilePathFromStandbyQueue =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "removeFilePathFromStandbyQueue",
      namespaceIdentifier: "filePath",
    },
  )

export const removeImageDomElement =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "removeImageDomElement",
      namespaceIdentifier: "filePath",
    },
  )

export const releaseFilePath = createNamespaceActionCreator<
  FilePathPayload,
  "filePath"
>({
  actionType: "releaseFilePath",
  namespaceIdentifier: "filePath",
})

export const resetDownloadedPercentage =
  createNamespaceActionCreator<
    ResetDownloadPercentagePayload,
    "filePath"
  >({
    actionType: "resetDownloadedPercentage",
    namespaceIdentifier: "filePath",
  })

export const retainFilePath = createNamespaceActionCreator<
  FilePathPayload,
  "filePath"
>({
  actionType: "retainFilePath",
  namespaceIdentifier: "filePath",
})

export const startFilePathDownload =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "startFilePathDownload",
      namespaceIdentifier: "filePath",
    },
  )

export const stopFilePathDownload =
  createNamespaceActionCreator<FilePathPayload, "filePath">(
    {
      actionType: "stopFilePathDownload",
      namespaceIdentifier: "filePath",
    },
  )

export const updateDownloadPercentage =
  createNamespaceActionCreator<
    DownloadPercentagePayload,
    "filePath"
  >({
    actionType: "updateDownloadPercentage",
    namespaceIdentifier: "filePath",
  })
