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

// The release runs in a timeout, after the event it answers.
const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve)
  })

const releasePointer = (target: Element) => {
  target.dispatchEvent(
    new Event("pointerup", { bubbles: true }),
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

describe("tap surfaces", () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  test("a surface a pointer press focuses keeps the focus until the press ends", async () => {
    const { surface } = createSurface()

    pressPointer(surface)
    surface.focus()
    await settle()

    expect(document.activeElement).toBe(surface)

    releasePointer(surface)
    await settle()

    expect(document.activeElement).toBe(document.body)
  })

  test("a surface focused after a pointer press ended gives the focus up", async () => {
    const { surface } = createSurface()

    pressPointer(surface)
    releasePointer(surface)
    surface.focus()
    await settle()

    expect(document.activeElement).toBe(document.body)
  })

  test("a surface Tab focuses keeps the focus", async () => {
    const { surface } = createSurface()

    pressPointer(document.body)
    releasePointer(document.body)
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
    releasePointer(label)
    await settle()

    expect(document.activeElement).toBe(document.body)
  })

  test("another button keeps the focus a pointer gives it", async () => {
    const button = document.createElement("button")

    document.body.append(button)
    pressPointer(button)
    button.focus()
    releasePointer(button)
    await settle()

    expect(document.activeElement).toBe(button)
  })

  test("cancels the click on Enter and Space for a pressed surface, but not for one Tab reached", () => {
    const { surface } = createSurface()

    const pressOn = (code: string, type = "keydown") => {
      const event = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        code,
      })

      surface.dispatchEvent(event)

      return event.defaultPrevented
    }

    pressPointer(surface)
    surface.focus()

    expect(pressOn("Delete")).toBe(false)
    expect(pressOn("Enter")).toBe(true)
    expect(pressOn("Space")).toBe(true)
    expect(pressOn("Space", "keyup")).toBe(true)

    pressKey("Tab")
    surface.blur()
    pressKey("Tab")
    surface.focus()

    expect(pressOn("Enter")).toBe(false)

    releasePointer(surface)
  })

  test("a key press does not make a pressed surface keyboard-reached", async () => {
    const { surface } = createSurface()

    pressPointer(surface)
    surface.focus()
    pressKey("Enter")
    releasePointer(surface)
    await settle()

    expect(document.activeElement).toBe(document.body)
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

    pressPointer(label)

    expect(read(surface)).toBe(false)

    releasePointer(label)
  })
})
