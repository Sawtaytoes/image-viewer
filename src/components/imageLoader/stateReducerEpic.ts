import { from } from "rxjs"
import { concatMap, reduce, tap } from "rxjs/operators"

import reducers from "./reducers"
import type { ImageLoaderEpic } from "./reduxObservable"

const stateReducerEpic: ImageLoaderEpic = (
  action$,
  state$,
) =>
  action$.pipe(
    concatMap((action) =>
      from(reducers).pipe(
        reduce(
          (state, { applyTo }) => applyTo(state, action),
          state$.value,
        ),
      ),
    ),
    tap((state) => {
      state$.next(state)
    }),
  )

export default stateReducerEpic
