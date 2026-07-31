import type { ImageLoaderAction } from "./imageLoaderActions"

// Reads a reducer's initial state by handing it an action no reducer handles,
// so every one falls through to its initial value. The untyped version passed a
// bare `{}`; this names the probe instead of relying on a typeless action.
const initialStateProbeAction: ImageLoaderAction = {
  payload: {},
  type: "@@imageLoader/probeInitialState",
}

const hasNamespace = (
  namespace: string | undefined,
): namespace is string => namespace !== undefined

const hasState = <NamespaceValue>(
  state: NamespaceValue | undefined,
) => state !== undefined

// How a namespace's slot is read out of, removed from, and written back into
// the slice map. Split out so the map's storage strategy is swappable (today
// there is one: the plain object in `createNamespaceReducer`).
export interface NamespaceStateHandlers<StoredValue> {
  getPreviousState: (options: {
    namespace: string
    previousNamespaceState: Record<string, StoredValue>
  }) => StoredValue
  removeNamespaceFromState: (options: {
    namespace: string
    previousNamespaceState: Record<string, StoredValue>
  }) => Record<string, StoredValue>
  updateNamespaceState: (options: {
    namespace: string
    nextState: StoredValue
    previousNamespaceState: Record<string, StoredValue>
  }) => Record<string, StoredValue>
}

// Turns a per-namespace reducer (`NamespaceValue` in, `NamespaceValue` out)
// into a reducer over the whole `{ [namespace]: NamespaceValue }` map.
//
// The map is typed `NonNullable<NamespaceValue>`, not `NamespaceValue`: a slice
// reducer's "no value" state is its `null` initial state, and a namespace that
// reduces back to it is deleted rather than stored. So `null` is a value the
// reducer passes through, never one the map holds.
//
// `reducer` and `initialNamespaceState` are optional in the type because the
// runtime guards below are real: they exist to catch a caller that forgot one.
const createNamespaceReducerCreator = <NamespaceValue>(
  reducer:
    | ((
        state: NamespaceValue | undefined,
        action: ImageLoaderAction,
      ) => NamespaceValue)
    | undefined,
  initialNamespaceState:
    | Record<string, NonNullable<NamespaceValue>>
    | undefined,
  {
    getPreviousState,
    removeNamespaceFromState,
    updateNamespaceState,
  }: NamespaceStateHandlers<NonNullable<NamespaceValue>>,
) => {
  if (!reducer) {
    throw new Error(
      "Missing `reducer` argument in `createNamespaceReducerCreator`.",
    )
  }

  if (!initialNamespaceState) {
    throw new Error(
      "Missing `initialNamespaceState` argument in `createNamespaceReducerCreator`.",
    )
  }

  const initialState = reducer(
    undefined,
    initialStateProbeAction,
  )

  return (
    previousNamespaceState: Record<
      string,
      NonNullable<NamespaceValue>
    > = initialNamespaceState,
    action: ImageLoaderAction,
  ): Record<string, NonNullable<NamespaceValue>> => {
    const { namespace } = action

    // Added for early-fail performance improvments.
    // Namespace Reducers only care when there is a `namespace`.
    if (!hasNamespace(namespace)) {
      return previousNamespaceState
    }

    const prevState = getPreviousState({
      namespace,
      previousNamespaceState,
    })

    const nextState = reducer(prevState, action)

    // If `nextState` didn't change after reducing, that means `action.type` wasn't used in `reducer` and we don't need to do any further complex calculations.
    const isStateUnchanged = nextState === prevState

    if (isStateUnchanged) {
      return previousNamespaceState
    }

    // Setting `nextState` to `initialState` means "remove me".
    // If the namespace state is back to its initial values, it can be safely removed.
    const isStateReset = nextState === initialState

    // If there wasn't already a state for this namespace, there are no changes.
    if (isStateReset && !hasState(prevState)) {
      return previousNamespaceState
    }

    // We can remove this namespace from our `nextState` since it no longer has values we care about.
    if (isStateReset) {
      return removeNamespaceFromState({
        namespace,
        previousNamespaceState,
      })
    }

    // A reducer only answers `null` with its own initial state, which the
    // `isStateReset` branch above has already handled — so this cannot be
    // reached, and it is what proves to the type system that the value being
    // stored is one the map can hold.
    if (nextState === null || nextState === undefined) {
      return previousNamespaceState
    }

    // We've determined this namespace needs to be updated in our state.
    return updateNamespaceState({
      namespace,
      nextState,
      previousNamespaceState,
    })
  }
}

export default createNamespaceReducerCreator
