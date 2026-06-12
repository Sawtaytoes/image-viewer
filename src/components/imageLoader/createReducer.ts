// A reducer for one state slice: a map from action type to a handler, plus the
// slice's initial state. Generic over the state shape and the action type, so
// each handler sees the slice's `State` and returns it. The reducer itself only
// needs the action's `type` to dispatch (hence the minimal `{ type: string }`
// constraint); handlers receive the whole action. An action whose `type` has no
// handler passes the state through unchanged.
const createReducer =
  <State, HandledAction extends { type: string }>(
    reducerActions: Record<
      string,
      (state: State, action: HandledAction) => State
    >,
    initialState: State,
  ) =>
  (
    state: State = initialState,
    action: HandledAction,
  ): State =>
    reducerActions[action.type]
      ? reducerActions[action.type](state, action)
      : state

export default createReducer
