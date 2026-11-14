import { describe, expect, test } from "vitest"

import isTapSurfaceEvent from "./isTapSurfaceEvent"

const dispatchKeyDown = (target: Element) => {
  let isSurface: boolean | undefined

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

describe(isTapSurfaceEvent.name, () => {
  test("is true for a key pressed on a tap surface or inside one", () => {
    const surface = document.createElement("button")
    const label = document.createElement("span")

    surface.setAttribute("data-tap-surface", "")
    surface.append(label)
    document.body.append(surface)

    expect(dispatchKeyDown(surface)).toBe(true)
    expect(dispatchKeyDown(label)).toBe(true)

    surface.remove()
  })

  test("is false for any other button", () => {
    const button = document.createElement("button")

    document.body.append(button)

    expect(dispatchKeyDown(button)).toBe(false)

    button.remove()
  })
})
