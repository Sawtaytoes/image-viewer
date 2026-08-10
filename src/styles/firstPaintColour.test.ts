import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  buildFirstPaintScript,
  DEFAULT_COLOR_SCHEME_STORAGE_KEY,
  daylight,
  resolveTokens,
} from "@charcuterie/tokens"
import { describe, expect, test } from "vitest"

// `index.html` no longer pins a scheme. It carries the inline first-paint script
// from `@charcuterie/tokens` — `buildFirstPaintScript(daylight)` — which runs
// before any stylesheet parses and sets `<html data-scheme>` from the saved
// (`localStorage`) or OS choice, painting the canvas with a scheme-branched
// fallback hex so first paint never flashes the wrong theme.
//
// That snippet is a *copy* pasted into the markup (it has to be inline to run
// early), and a copy drifts. These tests are the thing that notices: they
// regenerate the snippet from the package and insist the markup still contains
// it, and they check the fallback hexes against the token source — the same
// provenance guard the old single hardcoded hex had. Without them the failure
// mode is a flash of the wrong theme on window open, which nobody files a bug
// about and every other gate passes.
const INDEX_HTML_PATH = resolve(
  import.meta.dirname,
  "../../index.html",
)

describe("index.html's first-paint script", () => {
  test("contains the exact buildFirstPaintScript(daylight) snippet, un-drifted", () => {
    const markup = readFileSync(INDEX_HTML_PATH, "utf8")

    expect(markup).toContain(
      buildFirstPaintScript(daylight),
    )
  })

  test("uses the shared storage key so pre-paint and runtime agree", () => {
    const markup = readFileSync(INDEX_HTML_PATH, "utf8")

    // The runtime `localStoragePersistence` default is this same key; if they
    // disagree the pre-paint attribute and the hydrated state differ by a flash.
    expect(markup).toContain(
      `var KEY = "${DEFAULT_COLOR_SCHEME_STORAGE_KEY}"`,
    )
  })

  test("branches the fallback hex on both schemes' surface.base", () => {
    const markup = readFileSync(INDEX_HTML_PATH, "utf8")

    const dark = resolveTokens({
      scheme: "dark",
      variant: "daylight",
    })

    const light = resolveTokens({
      scheme: "light",
      variant: "daylight",
    })

    expect(markup).toContain(dark.colour.surface.base)
    expect(markup).toContain(light.colour.surface.base)
  })

  test("no longer pins a scheme in the <html> tag", () => {
    const markup = readFileSync(INDEX_HTML_PATH, "utf8")

    // The `<html …>` open tag must carry no `data-scheme` — the first-paint
    // script sets it. (Prose in comments may still mention the old pin, so scope
    // this to the actual open tag rather than the whole file.)
    const htmlTag =
      markup.match(/<html\b[^>]*>/s)?.[0] ?? ""

    expect(htmlTag).not.toContain("data-scheme")
  })
})
