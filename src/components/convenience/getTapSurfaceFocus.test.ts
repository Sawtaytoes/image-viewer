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

const pressKey = (code: string) => {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { code }),
  )
}

const pressPointer = (target: Element) => {
  target.dispatchEvent(
    new Event("pointerdown", { bubbles: true }),
  )
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

  test("is keyboard when Tab moved focus to the surface", () => {
    const { label, surface } = createSurface()

    pressKey("Tab")
    surface.focus()

    expect(readFocusOnEnter(surface)).toBe("keyboard")
    expect(readFocusOnEnter(label)).toBe("keyboard")
  })

  test("is pointer when a pointer press focused the surface", () => {
    const { surface } = createSurface()

    pressPointer(surface)
    surface.focus()

    expect(readFocusOnEnter(surface)).toBe("pointer")
  })

  test("is pointer after a pointer press on a surface that Tab had focused", () => {
    const { label, surface } = createSurface()

    pressKey("Tab")
    surface.focus()
    pressPointer(label)

    expect(readFocusOnEnter(surface)).toBe("pointer")
  })

  test("stays pointer when code restores focus after other keys", () => {
    const { surface } = createSurface()
    const other = document.createElement("button")

    document.body.append(other)
    pressPointer(surface)
    surface.focus()
    other.focus()
    pressKey("Delete")
    pressKey("Backspace")
    surface.focus()

    expect(readFocusOnEnter(surface)).toBe("pointer")
  })

  test("is null for any other button", () => {
    const button = document.createElement("button")

    document.body.append(button)

    expect(readFocusOnEnter(button)).toBeNull()
  })
})
