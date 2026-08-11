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
  const actionCreator = (
    payload: Payload,
  ): Action<Payload> => ({
    payload,
    type: actionType,
  })

  // `Object.assign` augments the function with its statics while keeping the
  // call signature, so the result satisfies `ActionCreator<Payload>` without a
  // cast.
  //
  // `toString` has to be an OWN property here. It used to be assigned to
  // `actionCreator.prototype.toString`, which never ran: `.prototype` is only
  // consulted for objects built with `new actionCreator()`, and stringifying
  // the function itself resolves `toString` up the *function's* chain to
  // `Function.prototype.toString` — so `${doThing}` returned the source text,
  // not "doThing". That line's only real effect was requiring a `function`
  // expression (arrows have no `.prototype`, so the assignment threw at module
  // load), which is why `complexity/useArrowFunction` had to be disabled.
  return Object.assign(actionCreator, {
    toString: () => actionType,
    type: actionType,
  })
}

export default createActionCreator
