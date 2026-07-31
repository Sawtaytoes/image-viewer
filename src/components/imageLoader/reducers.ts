import downloadedFilesReducer from "./downloadedFilesReducer"
import downloadPercentagesReducer from "./downloadPercentagesReducer"
import filePathsQueueReducer from "./filePathsQueueReducer"
import imageDomElementsReducer from "./imageDomElementsReducer"
import type { ImageLoaderAction } from "./imageLoaderActions"
import priorityQueueReducer from "./priorityQueueReducer"
import processingQueueReducer from "./processingQueueReducer"
import referenceCountsReducer from "./referenceCountsReducer"
import standbyQueueReducer from "./standbyQueueReducer"

// The whole image-loader store. Every slice is a flat map keyed by file path,
// and a key is deleted the moment its slice reducer falls back to its "no
// value" state — so a present key always holds a real value, and an absent one
// is how "nothing here" is spelled. Reads are unchecked index accesses, so
// treat them as possibly absent.
export interface ImageLoaderState {
  downloadedFiles: Record<string, string>
  downloadPercentages: Record<string, number>
  filePathsQueue: Record<string, string>
  imageDomElements: Record<string, HTMLImageElement>
  priorityQueue: Record<string, boolean>
  processingQueue: Record<string, boolean>
  referenceCounts: Record<string, number>
  standbyQueue: Record<string, boolean>
}

// One slice map, whichever it is.
export type ImageLoaderSlice =
  ImageLoaderState[keyof ImageLoaderState]

// What a state selector may surface: whole slice maps (`processQueueEpic`) or
// single entries out of them (`useStateSelector` in the components).
export type ImageLoaderSelection = Record<
  string,
  ImageLoaderSlice | ImageLoaderSlice[string]
>

// One slice's reducer, wrapped so it folds into the whole state. `applyTo`
// exists because TypeScript cannot correlate `state[namespace]` with the
// matching slice reducer across a heterogeneous array; capturing the namespace
// in the generic factory below does that once, per slice, with no cast.
export interface NamespaceReducerEntry {
  applyTo: (
    state: ImageLoaderState,
    action: ImageLoaderAction,
  ) => ImageLoaderState
  namespace: keyof ImageLoaderState
}

const createNamespaceReducerEntry = <
  Namespace extends keyof ImageLoaderState,
>(
  namespace: Namespace,
  reducer: (
    state: ImageLoaderState[Namespace],
    action: ImageLoaderAction,
  ) => ImageLoaderState[Namespace],
): NamespaceReducerEntry => ({
  applyTo: (state, action) => ({
    ...state,
    [namespace]: reducer(state[namespace], action),
  }),
  namespace,
})

const reducers: NamespaceReducerEntry[] = [
  createNamespaceReducerEntry(
    "downloadedFiles",
    downloadedFilesReducer,
  ),
  createNamespaceReducerEntry(
    "downloadPercentages",
    downloadPercentagesReducer,
  ),
  createNamespaceReducerEntry(
    "filePathsQueue",
    filePathsQueueReducer,
  ),
  createNamespaceReducerEntry(
    "imageDomElements",
    imageDomElementsReducer,
  ),
  createNamespaceReducerEntry(
    "priorityQueue",
    priorityQueueReducer,
  ),
  createNamespaceReducerEntry(
    "processingQueue",
    processingQueueReducer,
  ),
  createNamespaceReducerEntry(
    "referenceCounts",
    referenceCountsReducer,
  ),
  createNamespaceReducerEntry(
    "standbyQueue",
    standbyQueueReducer,
  ),
]

// Spelled out rather than derived by folding an empty action through every
// reducer: each namespace reducer answers an unhandled action with its own
// `initialNamespaceState`, which is the empty map, so this is exactly what that
// fold produced.
export const initialState: ImageLoaderState = {
  downloadedFiles: {},
  downloadPercentages: {},
  filePathsQueue: {},
  imageDomElements: {},
  priorityQueue: {},
  processingQueue: {},
  referenceCounts: {},
  standbyQueue: {},
}

export default reducers
