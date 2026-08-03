// The action object a namespace action creator produces. `namespace` is the
// slice key the namespace reducers fan the action out to — read off the payload
// at `namespaceIdentifier`. It stays optional because two of the creators are
// built without a `namespaceIdentifier`, and because a plain `Action` from
// `createActionCreator` travels the same stream.
export interface NamespaceAction<Payload> {
  namespace?: string
  payload: Payload
  type: string
}

// A namespace action creator: callable to build a `NamespaceAction`, plus a
// static `.type` and a `.toString()` that both yield the action type — so it can
// be used as a computed object key that stringifies to its type (see
// `createReducer`). Mirrors `ActionCreator` in `createActionCreator`.
export interface NamespaceActionCreator<Payload> {
  (payload: Payload): NamespaceAction<Payload>
  type: string
  toString(): string
}

// `NamespaceKey` is the payload key naming the namespace, so the payload is
// constrained to actually carry a string there — a namespace ends up as an
// object key in the slice map, so it cannot be anything else. It defaults to
// `never` for the creators that take no `namespaceIdentifier`; their actions
// carry no namespace and the namespace reducers skip them.
const createNamespaceActionCreator = <
  Payload extends Record<NamespaceKey, string>,
  NamespaceKey extends string = never,
>({
  actionType,
  namespaceIdentifier,
}: {
  actionType: string
  namespaceIdentifier?: NamespaceKey
}): NamespaceActionCreator<Payload> => {
  // Must stay a `function` (not an arrow): it needs its own `.prototype`
  // for the `.toString` below, which lets the action creator be used as a
  // computed object key that stringifies to its action type.
  const actionCreator = function (
    payload: Payload,
  ): NamespaceAction<Payload> {
    return {
      // Without a `namespaceIdentifier` the untyped version read
      // `payload[undefined]`, which is always `undefined`; this spells that
      // out so the index is a real key.
      namespace:
        namespaceIdentifier === undefined
          ? undefined
          : payload[namespaceIdentifier],
      payload,
      type: actionType,
    }
  }

  actionCreator.prototype.toString = () => actionType

  // `Object.assign` augments the function with its static `.type` while keeping
  // the call signature, so the result satisfies `NamespaceActionCreator`
  // without a cast.
  return Object.assign(actionCreator, {
    type: actionType,
  })
}

export default createNamespaceActionCreator
