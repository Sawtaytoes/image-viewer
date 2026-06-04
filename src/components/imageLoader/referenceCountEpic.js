import { filter, map, pluck, tap } from "rxjs/operators"

import {
  releaseFilePath,
  removeFilePath,
} from "./imageLoaderActions"
import ofType from "./ofType"

// Gates eviction behind the reference count: the real `removeFilePath`
// (blob revocation + per-path cleanup) only fires when the *last* holder
// releases. Retaining is intentionally NOT translated into `addFilePath` —
// downloads stay lazy, driven by `updateImageVisibility` as before — so a
// holder that retains a path it never displays (e.g. an off-screen file in an
// open folder) costs nothing until something makes it visible.
//
// `stateReducerEpic` is registered first and updates `state$` synchronously,
// so by the time this epic sees the action the decrement is already applied.
// A falsy `referenceCounts[filePath]` therefore means "the count just reached
// 0" (the key is deleted on reset) — i.e. the final holder let go.
const referenceCountEpic = (
  action$,
  state$,
  { dispatch },
) =>
  action$.pipe(
    ofType(releaseFilePath.type),
    pluck("payload"),
    filter(
      ({ filePath }) =>
        !state$.value.referenceCounts[filePath],
    ),
    map(({ filePath }) =>
      removeFilePath({
        filePath,
      }),
    ),
    tap(dispatch),
  )

export default referenceCountEpic
