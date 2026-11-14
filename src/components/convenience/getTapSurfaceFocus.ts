// A tap surface is a `<button>` that stands where a clickable `<div>` used to:
// a gallery tile, a folder tab, the viewer's center zone, the empty pane. Each
// carries `data-tap-surface`.
//
// The window-level shortcuts give Enter a meaning of their own (open the
// gallery's keyboard selection, or leave the viewer), and Enter on a focused
// `<button>` also clicks it. Which one should win depends on how the surface
// got focus:
//
// - "keyboard": the user tabbed to it, so Enter is meant for it. The shortcut
//   stands aside and the button's own click runs.
// - "pointer": a tap or click focused it on the way to doing its job, and the
//   user never chose it with the keyboard. When these were `<div>`s they took
//   no focus at all, so the shortcut runs and calls `preventDefault()`, which
//   cancels the button's click. Enter behaves as it always did.
//
// `:focus-visible` cannot tell these apart: Chromium makes the focused element
// match it on any key press, before the `keydown` listeners run. So the origin
// is recorded when focus moves, from the input that came just before it.

type TapSurfaceFocus = "keyboard" | "pointer"

const pointerFocusedSurfaces = new WeakSet<Element>()

let isPointerTheLastInput = false

const trackFocusOrigin = () => {
  window.addEventListener(
    "pointerdown",
    () => {
      isPointerTheLastInput = true
    },
    { capture: true },
  )

  window.addEventListener(
    "keydown",
    () => {
      isPointerTheLastInput = false
    },
    { capture: true },
  )

  window.addEventListener(
    "focusin",
    (event) => {
      if (!(event.target instanceof Element)) {
        return
      }

      if (isPointerTheLastInput) {
        pointerFocusedSurfaces.add(event.target)
      } else {
        pointerFocusedSurfaces.delete(event.target)
      }
    },
    { capture: true },
  )
}

trackFocusOrigin()

// How the tap surface that a key event came from got focus, or `null` when the
// event did not come from a tap surface.
const getTapSurfaceFocus = (
  event: KeyboardEvent,
): TapSurfaceFocus | null => {
  const surface =
    event.target instanceof Element
      ? event.target.closest("[data-tap-surface]")
      : null

  if (!surface) {
    return null
  }

  return pointerFocusedSurfaces.has(surface)
    ? "pointer"
    : "keyboard"
}

export default getTapSurfaceFocus
