export const getPreviousArrayIndex = index => (
	Math.max(
		index - 1,
		0,
	)
)

export const getNextArrayIndex = (
	index,
	arrayLength,
) => (
	Math.min(
		index + 1,
		arrayLength - 1,
	)
)
