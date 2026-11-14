import { afterEach, describe, expect, test } from "vitest"

import isTapSurfaceEvent from "./tapSurfaces"

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

// The blur runs in a microtask, after the focus event it answers.
const settle = () => Promise.resolve()

const createSurface = () => {
  const surface = document.createElement("button")
  const label = document.createElement("span")

  surface.setAttribute("data-tap-surface", "")
  surface.append(label)
  document.body.append(surface)

  return { label, surface }
}

describe("tap surfaces", () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  test("a surface a pointer focuses gives the focus up", async () => {
    const { surface } = createSurface()

    pressPointer(surface)
    surface.focus()
    await settle()

    expect(document.activeElement).toBe(document.body)
  })

  test("a surface Tab focuses keeps the focus", async () => {
    const { surface } = createSurface()

    pressPointer(document.body)
    pressKey("Tab")
    surface.focus()
    await settle()

    expect(document.activeElement).toBe(surface)
  })

  test("a focused surface gives the focus up when a pointer presses it", async () => {
    const { label, surface } = createSurface()

    pressKey("Tab")
    surface.focus()
    pressPointer(label)
    await settle()

    expect(document.activeElement).toBe(document.body)
  })

  test("another button keeps the focus a pointer gives it", async () => {
    const button = document.createElement("button")

    document.body.append(button)
    pressPointer(button)
    button.focus()
    await settle()

    expect(document.activeElement).toBe(button)
  })

  test("names a key event from a surface or from inside one", () => {
    const { label, surface } = createSurface()
    const other = document.createElement("button")

    document.body.append(other)

    const read = (target: Element) => {
      let isSurface = false

      const listener = (event: KeyboardEvent) => {
        isSurface = isTapSurfaceEvent(event)
      }

      window.addEventListener("keydown", listener)
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          code: "Enter",
        }),
      )
      window.removeEventListener("keydown", listener)

      return isSurface
    }

    expect(read(surface)).toBe(true)
    expect(read(label)).toBe(true)
    expect(read(other)).toBe(false)
  })
})
