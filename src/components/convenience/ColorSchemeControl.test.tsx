import { DEFAULT_COLOR_SCHEME_STORAGE_KEY } from "@charcuterie/logic/browser"
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import ColorSchemeControl from "./ColorSchemeControl"

// The switcher writes `data-scheme` on <html> and the mode into localStorage;
// both leak across tests in one worker, so reset them between cases.
afterEach(() => {
  window.localStorage.clear()

  document.documentElement.removeAttribute("data-scheme")
})

describe("ColorSchemeControl", () => {
  it("defaults to system and resolves data-scheme from the nativeTheme bridge", () => {
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

  it("cycles system → light and persists the pick", () => {
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

  it("overrides the hover/active background to the neutral title-bar tokens", () => {
    // Guard for the visible-hover fix. Charcuterie's ghost IconButton defaults to
    // the *accent* intent, whose hover is invisible against this app's
    // `bg-surface-sunken` title bar; we override to the neutral tokens the sibling
    // controls use, `!`-important so it beats the built-in accent hover. jsdom
    // computes no styles, so this only guards the class from silent removal — the
    // real proof is `build:renderer` + the __screenshots__ hover/focus captures.
    render(<ColorSchemeControl />)

    const button = screen.getByRole("button", {
      name: /colour scheme/i,
    })

    expect(button.className).toContain(
      "hover:bg-intent-neutral-surface-hover!",
    )
    expect(button.className).toContain(
      "active:bg-intent-neutral-solid-hover!",
    )
  })
})
