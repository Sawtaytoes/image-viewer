import { afterEach, describe, expect, test } from "vitest"

import getTapSurfaceFocus from "./getTapSurfaceFocus"

const readFocusOnEnter = (target: Element) => {
  let focus: ReturnType<typeof getTapSurfaceFocus> = null

  const listener = (event: KeyboardEvent) => {
    focus = getTapSurfaceFocus(event)
  }

  window.addEventListener("keydown", listener)
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      code: "Enter",
    }),
  )
  window.removeEventListener("keydown", listener)

  return focus
}

const createSurface = () => {
  const surface = document.createElement("button")
  const label = document.createElement("span")

  surface.setAttribute("data-tap-surface", "")
  surface.append(label)
  document.body.append(surface)

  return { label, surface }
}

describe(getTapSurfaceFocus.name, () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  test("is pointer when a pointer press focused the surface", () => {
    const { label, surface } = createSurface()

    surface.dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    )
    surface.focus()

    expect(readFocusOnEnter(surface)).toBe("pointer")
    expect(readFocusOnEnter(label)).toBe("pointer")
  })

  test("is keyboard when a key press came before the focus", () => {
    const { surface } = createSurface()

    surface.dispatchEvent(
      new Event("pointerdown", { bubbles: true }),
    )
    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Tab" }),
    )
    surface.focus()

    expect(readFocusOnEnter(surface)).toBe("keyboard")
  })

  test("is null for any other button", () => {
    const button = document.createElement("button")

    document.body.append(button)

    expect(readFocusOnEnter(button)).toBeNull()
  })
})
