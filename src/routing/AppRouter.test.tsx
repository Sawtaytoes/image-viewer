import { render, screen } from "@testing-library/react"
import { Link, Route, Routes } from "react-router"
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import { AppRouter } from "./AppRouter"

/**
 * The history is chosen from `location.protocol`, and this is the only place that
 * choice can be checked automatically.
 *
 * Browser mode is easy to drive for real — it is a Vite dev server on http. The
 * `file://` half is not: the packaged Electron renderer needs the preload bridge,
 * so it cannot be loaded in a bare browser, and the failure it guards against is
 * silent in exactly the wrong way. `BrowserRouter` under `file://` does not throw
 * on mount; it produces links that go nowhere and a reload that lands on a path
 * with no file behind it. So it is pinned here instead.
 *
 * The assertion is on the rendered `href`, not on which component was used, because
 * the href is the thing that actually has to differ.
 */

const setProtocol = (protocol: string) => {
  vi.spyOn(window, "location", "get").mockReturnValue({
    ...window.location,
    protocol,
  } as Location)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("AppRouter", () => {
  test("http gets a path history — a link is a real path", () => {
    setProtocol("http:")

    render(
      <AppRouter>
        <Routes>
          <Route
            element={<Link to="/somewhere">go</Link>}
            path="*"
          />
        </Routes>
      </AppRouter>,
    )

    expect(
      screen.getByText("go").getAttribute("href"),
    ).toBe("/somewhere")
  })

  test("file:// gets a hash history — a path link would go nowhere", () => {
    setProtocol("file:")

    render(
      <AppRouter>
        <Routes>
          <Route
            element={<Link to="/somewhere">go</Link>}
            path="*"
          />
        </Routes>
      </AppRouter>,
    )

    // The `#` is the whole point: under `file://` there is no server to answer
    // `/somewhere`, and no file at that path either.
    expect(
      screen.getByText("go").getAttribute("href"),
    ).toContain("#/somewhere")
  })
})
