import { DEFAULT_COLOR_SCHEME_STORAGE_KEY } from "@charcuterie/logic/browser"
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import ColorSchemeControl from "./ColorSchemeControl"

// The switcher writes `data-scheme` on <html> and the mode into localStorage;
// both leak across tests in one worker, so reset them between cases.
afterEach(() => {
  window.localStorage.clear()

  document.documentElement.removeAttribute("data-scheme")
})

describe("ColorSchemeControl", () => {
  test("defaults to system and resolves data-scheme from the nativeTheme bridge", () => {
    // The stubbed `window.api.colorScheme.get()` returns "dark" (the OS answer),
    // and with nothing persisted the mode is `system`, so it resolves to dark.
    render(<ColorSchemeControl />)

    expect(
      screen.getByRole("button", {
        name: /colour scheme: system/i,
      }),
    ).toBeInTheDocument()

    expect(
      document.documentElement.getAttribute("data-scheme"),
    ).toBe("dark")
  })

  test("cycles system → light and persists the pick", () => {
    render(<ColorSchemeControl />)

    fireEvent.click(
      screen.getByRole("button", {
        name: /colour scheme/i,
      }),
    )

    // Order is light → dark → system, so the mode after `system` is `light`,
    // which pins the resolved scheme regardless of the OS answer.
    expect(
      screen.getByRole("button", {
        name: /colour scheme: light/i,
      }),
    ).toBeInTheDocument()

    expect(
      document.documentElement.getAttribute("data-scheme"),
    ).toBe("light")

    expect(
      window.localStorage.getItem(
        DEFAULT_COLOR_SCHEME_STORAGE_KEY,
      ),
    ).toBe("light")
  })
})
