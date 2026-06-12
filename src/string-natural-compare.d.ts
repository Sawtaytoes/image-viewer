// `string-natural-compare` ships no types and has no `@types/` package, so
// declare the slice of its API we use. Mirrors its README: a default-exported
// comparator taking two strings and an options bag, returning the usual
// negative / 0 / positive sort number.
declare module "string-natural-compare" {
  interface NaturalCompareOptions {
    alphabet?: string
    // The library's own option name — not ours to rename to the is/has
    // boolean convention.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    caseInsensitive?: boolean
  }

  const naturalCompare: (
    a: string,
    b: string,
    options?: NaturalCompareOptions,
  ) => number

  export default naturalCompare
}
