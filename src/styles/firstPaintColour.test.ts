import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { resolveTokens } from "@charcuterie/tokens"
import { describe, expect, it } from "vitest"

// `index.html` carries one hardcoded hex, in an inline `<style>`, and it has to:
// the rule paints the window before any stylesheet has parsed, which is before
// `--color-surface-base` exists. A custom property cannot be its own fallback.
//
// So the hex is a copy, and a copy drifts. This test is the thing that notices —
// it reads the token out of the package and the literal out of the markup and
// insists they are the same colour. Without it the failure mode is a white flash
// on every window open, which nobody files a bug about and every gate passes.
//
// The scheme/variant pair must match `<html data-scheme=… data-variant=…>`;
// `daylight` is the default variant, which is why `index.html` does not name it.
const INDEX_HTML_PATH = resolve(
  import.meta.dirname,
  "../../index.html",
)

describe("index.html's first-paint colour", () => {
  it("matches surface.base for the scheme the document pins", () => {
    const markup = readFileSync(INDEX_HTML_PATH, "utf8")

    const backgroundMatch = markup.match(
      /background-color:\s*(#[0-9a-fA-F]{3,8})/,
    )

    expect(backgroundMatch).not.toBeNull()

    const { colour } = resolveTokens({
      scheme: "dark",
      variant: "daylight",
    })

    expect(
      backgroundMatch?.[1]?.toLowerCase(),
    ).toStrictEqual(colour.surface.base.toLowerCase())
  })

  it("pins the same scheme in the attribute and in color-scheme", () => {
    const markup = readFileSync(INDEX_HTML_PATH, "utf8")

    expect(markup).toContain('data-scheme="dark"')
    expect(markup).toContain("color-scheme: dark")
  })
})
