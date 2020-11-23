const createActionCreator = ({
	actionType,
}) => {
	const actionCreator = function(
		payload,
	) {
		return ({
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

export default createActionCreator
