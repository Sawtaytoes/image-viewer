import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import DeleteForeverIcon from "./DeleteForeverIcon"

// Smoke tests for the React 19 + Tailwind render pipeline.
//
// The second test used to be "applies the Emotion css prop", asserting a
// computed `color` — which worked only because Emotion injected a <style> tag
// at runtime. Tailwind has no runtime: utilities are generated at build time by
// scanning source text, and `vitest.config.ts` deliberately does not run the
// Tailwind plugin, so jsdom will never compute a colour from `text-…`. The two
// things that CAN break and that a test can still see are checked instead:
//
//   1. a static utility string actually reaches the DOM node's class attribute
//      (which is also the exact shape Tailwind's scanner looks for — a class
//      assembled from a template literal would produce no CSS at all), and
//   2. nothing is injecting Emotion's runtime classes any more.
const REPO_ROOT = resolve(import.meta.dirname, "../../..")

describe("render pipeline", () => {
  test("renders an inline SVG icon", () => {
    const { container } = render(<DeleteForeverIcon />)

    const svg = container.querySelector("svg")

    expect(svg).toBeInTheDocument()
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24")
    expect(container.querySelector("path")).toBeTruthy()
  })

  test("puts static Tailwind utilities on the class attribute", () => {
    const StyledBox = () => (
      <div className="bg-surface-raised text-content-primary">
        hello
      </div>
    )

    const { getByText } = render(<StyledBox />)

    expect(getByText("hello")).toHaveClass(
      "bg-surface-raised",
      "text-content-primary",
    )
  })

  test("renders without Emotion's runtime classes", () => {
    const { container } = render(<DeleteForeverIcon />)

    expect(
      container.querySelector('[class*="css-"]'),
    ).toBeNull()
  })

  test("wires the one stylesheet into the renderer entry", () => {
    // The other half of the pipeline is a build step no jsdom render can
    // observe: if `renderer.tsx` stops importing the stylesheet, or the
    // stylesheet stops importing Tailwind, every utility above silently
    // becomes an inert string. Read the two files instead.
    const readRepoFile = (relativePath: string) =>
      readFileSync(resolve(REPO_ROOT, relativePath), "utf8")

    expect(readRepoFile("src/renderer.tsx")).toContain(
      './styles/tailwind.css"',
    )

    const stylesheet = readRepoFile(
      "src/styles/tailwind.css",
    )

    expect(stylesheet).toContain('@import "tailwindcss"')

    expect(stylesheet).toContain(
      '@import "@charcuterie/tokens/theme.css"',
    )
  })
})
