import { css } from "@emotion/react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import DeleteForeverIcon from "./DeleteForeverIcon"

// Smoke tests for the React 19 + Emotion (css prop) render pipeline.

describe("render pipeline", () => {
  it("renders an inline SVG icon", () => {
    const { container } = render(<DeleteForeverIcon />)

    const svg = container.querySelector("svg")

    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24")
    expect(container.querySelector("path")).toBeTruthy()
  })

  it("applies the Emotion css prop", () => {
    const ColoredBox = () => (
      <div
        css={css`
          color: rgb(1, 2, 3);
        `}
      >
        hello
      </div>
    )

    const { getByText } = render(<ColoredBox />)

    expect(getByText("hello")).toHaveStyle({
      color: "rgb(1, 2, 3)",
    })
  })
})
