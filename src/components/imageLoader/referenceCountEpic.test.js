import { filter, tap } from "rxjs/operators"
import { beforeEach, describe, expect, it } from "vitest"

import {
  addFilePath,
  releaseFilePath,
  removeFilePath,
  retainFilePath,
} from "./imageLoaderActions"
import { initialState } from "./reducers"
import { createReduxObservable } from "./reduxObservable"
import referenceCountEpic from "./referenceCountEpic"
import stateReducerEpic from "./stateReducerEpic"

// Drives the real `stateReducerEpic` + `referenceCountEpic` against the real
// reducers so the "stateReducerEpic mutates state$ first, synchronously" timing
// the epic relies on is exercised rather than mocked. A capture epic records
// every action flowing through the store (including the `removeFilePath` the
// epic dispatches internally) without re-dispatching anything.
const createTestStore = () => {
  const dispatchedActions = []

  const captureEpic = (action$) =>
    action$.pipe(
      tap((action) => {
        dispatchedActions.push(action)
      }),
      filter(() => false),
    )

  const { dispatchReduxAction, reduxObservable$ } =
    createReduxObservable({
      epics: [
        stateReducerEpic, // Must stay first to initialize `state$`.
        referenceCountEpic,
        captureEpic,
      ],
      initialState,
    })

  const subscription = reduxObservable$.subscribe()

  const typesFor = (actionType) =>
    dispatchedActions.filter(
      ({ type }) => type === actionType,
    )

  return {
    dispatch: dispatchReduxAction,
    typesFor,
    unsubscribe: () => {
      subscription.unsubscribe()
    },
  }
}

describe("referenceCountEpic", () => {
  const filePath = "/photos/a.png"

  let store

  beforeEach(() => {
    store = createTestStore()
  })

  it("keeps the entry while holders remain and evicts on the final release", () => {
    store.dispatch(retainFilePath({ filePath }))
    store.dispatch(retainFilePath({ filePath }))

    // Two holders, one lets go: still referenced, so no eviction.
    store.dispatch(releaseFilePath({ filePath }))

    expect(
      store.typesFor(removeFilePath.type),
    ).toHaveLength(0)

    // Last holder lets go: the count hits 0, so the blob is evicted exactly once.
    store.dispatch(releaseFilePath({ filePath }))

    expect(store.typesFor(removeFilePath.type)).toEqual([
      removeFilePath({ filePath }),
    ])
  })

  it("never turns a retain into a load (downloads stay lazy)", () => {
    store.dispatch(retainFilePath({ filePath }))

    expect(store.typesFor(addFilePath.type)).toHaveLength(0)
    expect(
      store.typesFor(removeFilePath.type),
    ).toHaveLength(0)
  })

  it("scopes counts per filePath", () => {
    const otherFilePath = "/photos/b.png"

    store.dispatch(retainFilePath({ filePath }))
    store.dispatch(
      retainFilePath({ filePath: otherFilePath }),
    )

    store.dispatch(releaseFilePath({ filePath }))

    expect(store.typesFor(removeFilePath.type)).toEqual([
      removeFilePath({ filePath }),
    ])
  })
})
