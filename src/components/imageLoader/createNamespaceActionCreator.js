const createNamespaceActionCreator = ({
	actionType,
	namespaceIdentifier,
}) => {
	const actionCreator = function(
		payload,
	) {
		return ({
			namespace: (
				payload
				[namespaceIdentifier]
			),
			payload,
			type: actionType,
		})
	}

	actionCreator
	.prototype
	.toString = () => (
		actionType
	)

	actionCreator
	.type = (
		actionType
	)

	return actionCreator
}

export default createNamespaceActionCreator

