// A tap surface is a `<button>` that stands where a clickable `<div>` used to:
// a gallery tile, a folder tab, the viewer's center zone, the empty pane. Each
// carries `data-tap-surface`.
//
// A `<div>` took no focus, so after a tap the page's focus was on the body,
// and Enter and Space went only to the window-level shortcuts. A `<button>`
// takes focus when it is pressed, and Enter or Space on a focused button
// clicks it, so a tap would change what those keys do next. To keep that from
// happening, a tap surface gives up focus when a pointer press on it ends, or
// as soon as a pointer gives it focus after the press has ended (a touch tap
// focuses on release). That leaves the page as the `<div>` left it.
//
// The release waits for the press to end. Blurring the button while the press
// is still down (inside the `focusin` that the press causes) cancels a native
// drag of the `<img>` inside it, and the release then becomes a click; a
// thumbnail dragged on `master` must not open.
//
// So a tap surface that HAS focus was reached from the keyboard (Tab), or put
// back by code after a key press. Enter and Space are meant for it then, and a
// window shortcut that handles Enter stands aside when `isTapSurfaceEvent` is
// true, so the button's own click runs once.

const tapSurfaceSelector = "[data-tap-surface]"

let isPointerTheLastInput = false

let isPointerPressed = false

const findTapSurface = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest(tapSurfaceSelector)
    : null

// After the current event and its default action, so a `click` that the
// release is about to fire still fires.
const releaseFocusedTapSurface = () => {
  setTimeout(() => {
    const surface = findTapSurface(document.activeElement)

    if (
      isPointerTheLastInput &&
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
    () => {
      isPointerTheLastInput = true
      isPointerPressed = true
    },
    { capture: true },
  )

  for (const pressEndType of [
    "pointerup",
    "pointercancel",
    "dragend",
  ]) {
    window.addEventListener(
      pressEndType,
      () => {
        isPointerPressed = false

        releaseFocusedTapSurface()
      },
      { capture: true },
    )
  }

  window.addEventListener(
    "focusin",
    (event) => {
      if (
        isPointerTheLastInput &&
        !isPointerPressed &&
        findTapSurface(event.target)
      ) {
        releaseFocusedTapSurface()
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
