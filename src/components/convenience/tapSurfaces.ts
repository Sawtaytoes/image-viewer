// A tap surface is a `<button>` that stands where a clickable `<div>` used to:
// a gallery tile, a folder tab, the viewer's center zone, the empty pane. Each
// carries `data-tap-surface`.
//
// A `<div>` took no focus, so after a tap the page's focus was on the body,
// and Enter and Space went only to the window-level shortcuts. A `<button>`
// takes focus when it is pressed, and Enter or Space on a focused button
// clicks it, so a tap would change what those keys do next. To keep that from
// happening, a tap surface gives up focus as soon as a pointer gives it focus
// (or presses it while it has focus), which leaves the page as the `<div>`
// left it.
//
// So a tap surface that HAS focus was reached from the keyboard (Tab), or put
// back by code after a key press. Enter and Space are meant for it then, and a
// window shortcut that handles Enter stands aside when `isTapSurfaceEvent` is
// true, so the button's own click runs once.

const tapSurfaceSelector = "[data-tap-surface]"

let isPointerTheLastInput = false

const findTapSurface = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest(tapSurfaceSelector)
    : null

const releaseFocus = (surface: Element) => {
  queueMicrotask(() => {
    if (
      surface instanceof HTMLElement &&
      document.activeElement === surface
    ) {
      surface.blur()
    }
  })
}

const keepTapsFromFocusingTapSurfaces = () => {
  window.addEventListener(
    "keydown",
    () => {
      isPointerTheLastInput = false
    },
    { capture: true },
  )

  window.addEventListener(
    "pointerdown",
    (event) => {
      isPointerTheLastInput = true

      const surface = findTapSurface(event.target)

      if (surface) {
        releaseFocus(surface)
      }
    },
    { capture: true },
  )

  window.addEventListener(
    "focusin",
    (event) => {
      const surface = findTapSurface(event.target)

      if (surface && isPointerTheLastInput) {
        releaseFocus(surface)
      }
    },
    { capture: true },
  )
}

keepTapsFromFocusingTapSurfaces()

// Whether a key event came from a focused tap surface, which means the user
// reached it from the keyboard and the key is meant for it.
const isTapSurfaceEvent = (event: KeyboardEvent) =>
  findTapSurface(event.target) !== null

export default isTapSurfaceEvent
