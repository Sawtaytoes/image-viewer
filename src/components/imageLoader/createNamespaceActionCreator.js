const createNamespaceActionCreator = ({
  actionType,
  namespaceIdentifier,
}) => {
  // Must stay a `function` (not an arrow): it needs its own `.prototype`
  // for the `.toString` below, which lets the action creator be used as a
  // computed object key that stringifies to its action type.
  const actionCreator = function (payload) {
    return {
      namespace: payload[namespaceIdentifier],
      payload,
      type: actionType,
    }
  }

  actionCreator.prototype.toString = () => actionType

  actionCreator.type = actionType

  return actionCreator
}

export default createNamespaceActionCreator
