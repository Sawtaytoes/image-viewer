import stringNaturalCompare from "string-natural-compare"

const compareNaturalStrings = (
  firstString: string,
  secondString: string,
): number =>
  stringNaturalCompare(firstString, secondString, {
    caseInsensitive: true,
  })

export default compareNaturalStrings
