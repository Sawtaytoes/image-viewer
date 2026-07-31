import {
  BehaviorSubject,
  from,
  Observable,
  Subject,
} from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  mergeAll,
  mergeMap,
  scan,
  startWith,
  switchMap,
} from "rxjs/operators"

import catchEpicError from "./catchEpicError"
import type { ImageLoaderAction } from "./imageLoaderActions"
import {
  initialState as defaultInitialState,
  type ImageLoaderSelection,
  type ImageLoaderState,
} from "./reducers"

const isLocalDevelopment = true

// Subscribes to a projection of the store. The projection is compared
// key-by-key, so a selector that rebuilds the same values every time does not
// push a new object at its subscribers.
export type CreateStateObservable = <
  Selected extends ImageLoaderSelection,
>(
  stateSelector: (state: ImageLoaderState) => Selected,
) => Observable<Selected>

export interface EpicDependencies {
  createStateObservable: CreateStateObservable
  dispatch: (action: ImageLoaderAction) => ImageLoaderAction
}

// Actions in, actions out — except `stateReducerEpic`, which emits the reduced
// state itself, hence the union in the output.
export type ImageLoaderEpic = (
  action$: Observable<ImageLoaderAction>,
  state$: BehaviorSubject<ImageLoaderState>,
  dependencies: EpicDependencies,
) => Observable<ImageLoaderAction | ImageLoaderState>

declare global {
  interface Window {
    // Dev-only handles for driving the store from DevTools (see
    // `isLocalDevelopment` below).
    dispatchReduxAction?: (
      action: ImageLoaderAction,
    ) => ImageLoaderAction
    state$?: BehaviorSubject<ImageLoaderState>
  }
}

export const createReduxObservable = ({
  dependencies = {},
  epics,
  initialState = defaultInitialState,
}: {
  dependencies?: Partial<EpicDependencies>
  epics: ImageLoaderEpic[]
  initialState?: ImageLoaderState
}) => {
  const action$ = new Subject<ImageLoaderAction>()

  const dispatchReduxAction = (
    action: ImageLoaderAction,
  ): ImageLoaderAction => {
    action$.next(action)

    return action
  }

  const state$ = new BehaviorSubject<ImageLoaderState>(
    initialState,
  )

  const hotReload$ = new BehaviorSubject<string[]>([])

  const createStateObservable: CreateStateObservable = <
    Selected extends ImageLoaderSelection,
  >(
    stateSelector: (state: ImageLoaderState) => Selected,
  ) =>
    new Observable<Selected>((observer) => {
      const subscriber = state$
        .pipe(
          map(stateSelector),
          // Seedless on purpose. The untyped version seeded this with the
          // whole store state, whose keys never match a projection's — so the
          // very first comparison always reported "changed" and passed the
          // projection straight through, which is exactly what a seedless
          // `scan` does with its first value.
          scan(
            (
              previousState: Selected,
              nextState: Selected,
            ) => {
              const isStateChanged = Array.from(
                new Set([
                  ...Object.keys(previousState),
                  ...Object.keys(nextState),
                ]),
              ).some(
                (stateKey) =>
                  !Object.is(
                    previousState[stateKey],
                    nextState[stateKey],
                  ),
              )

              return isStateChanged
                ? nextState
                : previousState
            },
          ),
          distinctUntilChanged(),
        )
        .subscribe((state) => {
          observer.next(state)
        })

      return () => {
        subscriber.unsubscribe()
      }
    })

  const onHotReload = (changedFilePaths: string[]) => {
    hotReload$.next(changedFilePaths)
  }

  if (isLocalDevelopment) {
    window.dispatchReduxAction = dispatchReduxAction
    window.state$ = state$
  }

  const epicDependencies: EpicDependencies = {
    ...dependencies,
    createStateObservable,
    dispatch: dispatchReduxAction,
  }

  return {
    createStateObservable,
    dispatchReduxAction,
    onHotReload,
    reduxObservable$: from(epics).pipe(
      filter((epic) => !Object.is(typeof epic, "boolean")),
      mergeMap((epic) =>
        hotReload$.pipe(
          mergeAll(),
          filter((changedFilePath) =>
            Object.is(
              // The preload bridge's `basename` takes no extension argument —
              // it forwards a single path — so the changed file's extension is
              // still on the name here and this never matches an epic's
              // function name. Harmless today: the `module.hot` wiring that
              // would feed `hotReload$` is commented out in
              // `createdReduxObservable`, and `startWith(null)` starts every
              // epic regardless.
              window.api.path.basename(changedFilePath),
              epic.name,
            ),
          ),
          startWith(null),
          switchMap(() =>
            epic(action$, state$, epicDependencies).pipe(
              catchEpicError<
                ImageLoaderAction | ImageLoaderState
              >(epic.name),
            ),
          ),
        ),
      ),
      catchEpicError("rootEpic"),
    ),
  }
}
