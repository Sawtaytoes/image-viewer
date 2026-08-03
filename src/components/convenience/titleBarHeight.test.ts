import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import TITLE_BAR_HEIGHT from "./titleBarHeight"

// One number, three homes, and none of them can read the others:
//
//   1. this module, for the two views that do arithmetic with it
//   2. `--title-bar-height` in `src/styles/tailwind.css`, because a Tailwind
//      class cannot interpolate a JS constant the way an Emotion template
//      literal could — that interpolation is exactly what the Tailwind swap
//      took away, and this variable is what replaced it
//   3. `titleBarOverlay.height` in `src/main.js`, which is Electron's own
//      native window-controls strip and runs in a different process entirely
//
// Drift between 1 and 2 puts the chrome bar behind the title bar. Drift between
// 1 and 3 puts the native minimise/close buttons off our strip. Neither throws,
// neither fails a typecheck, and both look like a rendering bug.
const REPO_ROOT = resolve(import.meta.dirname, "../../..")

const readRepoFile = (relativePath: string) =>
  readFileSync(resolve(REPO_ROOT, relativePath), "utf8")

describe("TITLE_BAR_HEIGHT", () => {
  it("matches --title-bar-height in the stylesheet", () => {
    const declaration = readRepoFile(
      "src/styles/tailwind.css",
    ).match(/--title-bar-height:\s*(\d+)px/)

    expect(declaration).not.toBeNull()

    expect(Number(declaration?.[1])).toStrictEqual(
      TITLE_BAR_HEIGHT,
    )
  })

  it("matches titleBarOverlay.height in the main process", () => {
    // Read the `titleBarOverlay` block first, then the height out of
    // it — `main.js` is 800 lines and a bare /height:\s*(\d+)/ would
    // happily match the window's own dimensions.
    const overlayBlock = readRepoFile("src/main.js").match(
      /titleBarOverlay:\s*\{[^}]*\}/,
    )

    expect(overlayBlock).not.toBeNull()

    const overlayHeight =
      overlayBlock?.[0]?.match(/height:\s*(\d+)/)

    expect(overlayHeight).not.toBeNull()

    expect(Number(overlayHeight?.[1])).toStrictEqual(
      TITLE_BAR_HEIGHT,
    )
  })
})
