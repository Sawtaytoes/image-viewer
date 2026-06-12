// The action object an action creator produces.
export interface Action<Payload> {
  payload: Payload
  type: string
}

// An action creator: callable to build an `Action`, plus a static `.type` and a
// `.toString()` that both yield the action type — so it can be used as a
// computed object key that stringifies to its type (see `createReducer`).
export interface ActionCreator<Payload> {
  (payload: Payload): Action<Payload>
  type: string
  toString(): string
}

const createActionCreator = <Payload>({
  actionType,
}: {
  actionType: string
}): ActionCreator<Payload> => {
  // Must stay a `function` (not an arrow): it needs its own `.prototype` for
  // the `.toString` below, which lets the action creator be used as a computed
  // object key that stringifies to its action type.
  const actionCreator = function (
    payload: Payload,
  ): Action<Payload> {
    return {
      payload,
      type: actionType,
    }
  }

  actionCreator.prototype.toString = () => actionType

  // `Object.assign` augments the function with its static `.type` while keeping
  // the call signature, so the result satisfies `ActionCreator<Payload>`
  // without a cast.
  return Object.assign(actionCreator, {
    type: actionType,
  })
}

export default createActionCreator
