import createNamespaceReducerCreator, {
  type NamespaceStateHandlers,
} from "./createNamespaceReducerCreator"
import type { ImageLoaderAction } from "./imageLoaderActions"

const getPreviousState = <NamespaceValue>({
  namespace,
  previousNamespaceState,
}: {
  namespace: string
  previousNamespaceState: Record<string, NamespaceValue>
}): NamespaceValue => previousNamespaceState[namespace]

const removeNamespaceFromState = <NamespaceValue>({
  namespace,
  previousNamespaceState,
}: {
  namespace: string
  previousNamespaceState: Record<string, NamespaceValue>
}): Record<string, NamespaceValue> => {
  const nextNamespaceState = { ...previousNamespaceState }

  Reflect.deleteProperty(nextNamespaceState, namespace)

  return nextNamespaceState
}

const updateNamespaceState = <NamespaceValue>({
  namespace,
  nextState,
  previousNamespaceState,
}: {
  namespace: string
  nextState: NamespaceValue
  previousNamespaceState: Record<string, NamespaceValue>
}): Record<string, NamespaceValue> => ({
  ...previousNamespaceState,
  [namespace]: nextState,
})

// The plain-object namespace map every slice in this store uses.
// `NamespaceValue` is inferred from the slice reducer, so a slice that reduces
// to `string | null` produces a `Record<string, string>` — the `null` is that
// reducer's "no value" state, and reaching it makes
// `createNamespaceReducerCreator` drop the key rather than store it.
const createNamespaceReducer = <NamespaceValue>(
  reducer:
    | ((
        state: NamespaceValue | undefined,
        action: ImageLoaderAction,
      ) => NamespaceValue)
    | undefined,
  initialNamespaceState: Record<
    string,
    NonNullable<NamespaceValue>
  > = {},
) => {
  if (typeof initialNamespaceState !== "object") {
    throw new Error(
      "`initialNamespaceState` not set to type `object` in `createNamespaceReducer`.",
    )
  }

  const namespaceStateHandlers: NamespaceStateHandlers<
    NonNullable<NamespaceValue>
  > = {
    getPreviousState,
    removeNamespaceFromState,
    updateNamespaceState,
  }

  return createNamespaceReducerCreator(
    reducer,
    initialNamespaceState,
    namespaceStateHandlers,
  )
}

export default createNamespaceReducer
