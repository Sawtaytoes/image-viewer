// A tap surface is a `<button>` that stands where a clickable `<div>` used to:
// a gallery tile, a folder tab, the viewer's center zone, the empty pane. Each
// carries `data-tap-surface`.
//
// The window-level shortcuts give Enter a meaning of their own (open the
// gallery's keyboard selection, or leave the viewer), and Enter on a focused
// `<button>` also clicks it. Which one should win depends on how the user
// reached the surface:
//
// - "keyboard": the user tabbed to it, and has not pressed it with a pointer
//   since, so Enter is meant for it. The shortcut stands aside and the
//   button's own click runs.
// - "pointer": anything else. A tap or click focuses a button on the way to
//   doing its job, and focus can come back to one in code (a dialog restoring
//   focus on close) without the user choosing it. When these were `<div>`s
//   they took no focus at all, so the shortcut runs and calls
//   `preventDefault()`, which cancels the button's click. Enter behaves as it
//   always did.
//
// Only a focus that directly follows a Tab key press marks a surface as
// keyboard-reached, and any pointer press on the surface clears the mark.
// `:focus-visible` cannot make this choice: Chromium makes the focused element
// match it on any key press, before the `keydown` listeners run.

type TapSurfaceFocus = "keyboard" | "pointer"

const tapSurfaceSelector = "[data-tap-surface]"

const keyboardReachedSurfaces = new WeakSet<Element>()

let isTabTheLastInput = false

const findTapSurface = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest(tapSurfaceSelector)
    : null

const trackKeyboardReachedSurfaces = () => {
  window.addEventListener(
    "keydown",
    (event) => {
      isTabTheLastInput = event.code === "Tab"
    },
    { capture: true },
  )

  window.addEventListener(
    "pointerdown",
    (event) => {
      isTabTheLastInput = false

      const surface = findTapSurface(event.target)

      if (surface) {
        keyboardReachedSurfaces.delete(surface)
      }
    },
    { capture: true },
  )

  window.addEventListener(
    "focusin",
    (event) => {
      const surface = findTapSurface(event.target)

      if (surface && isTabTheLastInput) {
        keyboardReachedSurfaces.add(surface)
      }
    },
    { capture: true },
  )
}

trackKeyboardReachedSurfaces()

// How the user reached the tap surface that a key event came from, or `null`
// when the event did not come from a tap surface.
const getTapSurfaceFocus = (
  event: KeyboardEvent,
): TapSurfaceFocus | null => {
  const surface = findTapSurface(event.target)

  if (!surface) {
    return null
  }

  return keyboardReachedSurfaces.has(surface)
    ? "keyboard"
    : "pointer"
}

export default getTapSurfaceFocus
