const stringNaturalCompare = global.require('string-natural-compare')

const compareNaturalStrings = (
	(
		a,
		b,
	) => (
		stringNaturalCompare(
			a,
			b,
			{ caseInsensitive: true }
		)
	)
)

export default compareNaturalStrings
