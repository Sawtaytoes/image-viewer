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
// Until that release runs (or while the press is held), a pressed surface
// still has focus, so its own click on Enter or Space is cancelled and the key
// goes to the window shortcuts, as it did on the body.
//
// A tap surface that Tab focused, and no pointer has pressed since, was reached
// from the keyboard. Enter and Space are meant for it, and a window shortcut
// that handles Enter stands aside when `isTapSurfaceEvent` is true, so the
// button's own click runs once.

const tapSurfaceSelector = "[data-tap-surface]"

// Activation keys a focused `<button>` answers with a click.
const activationKeyCodes: readonly string[] = [
  "Enter",
  "NumpadEnter",
  "Space",
]

// Surfaces a pointer pressed, until Tab focuses them. A later key press does
// not take a surface out: a key that arrives while the press is held, or
// before the release below runs, must still not click it.
const pointerPressedSurfaces = new WeakSet<Element>()

let isPointerPressed = false

// Set by a Tab key press and used up by the next focus change, so only the
// focus that Tab itself causes counts as reaching a surface from the keyboard.
let isTabFocusPending = false

const findTapSurface = (target: EventTarget | null) =>
  target instanceof Element
    ? target.closest(tapSurfaceSelector)
    : null

const isPointerPressedSurface = (
  surface: Element | null,
): surface is HTMLElement =>
  surface instanceof HTMLElement &&
  pointerPressedSurfaces.has(surface)

// After the current event and its default action, so a `click` that the
// release is about to fire still fires.
const releaseFocusedTapSurface = () => {
  setTimeout(() => {
    const surface = findTapSurface(document.activeElement)

    if (
      isPointerPressedSurface(surface) &&
      document.activeElement === surface
    ) {
      surface.blur()
    }
  })
}

const keepTapsFromFocusingTapSurfaces = () => {
  // Until the release runs, a surface a pointer pressed still has focus. Its
  // own click on an activation key is cancelled; the event still reaches the
  // window shortcuts, as it did when focus was on the body. Space clicks on
  // `keyup`, and a button the pointer is still holding down clicks on that
  // `keyup` even when its `keydown` was cancelled, so both are cancelled.
  const cancelPressedSurfaceActivation = (
    event: KeyboardEvent,
  ) => {
    if (
      activationKeyCodes.includes(event.code) &&
      isPointerPressedSurface(findTapSurface(event.target))
    ) {
      event.preventDefault()
    }
  }

  window.addEventListener(
    "keydown",
    (event) => {
      isTabFocusPending = event.code === "Tab"

      cancelPressedSurfaceActivation(event)
    },
    { capture: true },
  )

  window.addEventListener(
    "keyup",
    cancelPressedSurfaceActivation,
    { capture: true },
  )

  window.addEventListener(
    "pointerdown",
    (event) => {
      isPointerPressed = true
      isTabFocusPending = false

      const surface = findTapSurface(event.target)

      if (surface) {
        pointerPressedSurfaces.add(surface)
      }
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
      const surface = findTapSurface(event.target)
      const isTabFocus = isTabFocusPending

      isTabFocusPending = false

      if (!surface) {
        return
      }

      if (isTabFocus) {
        pointerPressedSurfaces.delete(surface)

        return
      }

      // A touch tap focuses on release, and code (a dialog closing) can put
      // focus back. Neither makes a pressed surface keyboard-reached.
      if (
        !isPointerPressed &&
        pointerPressedSurfaces.has(surface)
      ) {
        releaseFocusedTapSurface()
      }
    },
    { capture: true },
  )
}

keepTapsFromFocusingTapSurfaces()

// Whether a key event came from a tap surface the user reached from the
// keyboard, which means the key is meant for it. A surface a pointer pressed
// is not one: the key belongs to the window shortcuts, as it did on the body.
const isTapSurfaceEvent = (event: KeyboardEvent) => {
  const surface = findTapSurface(event.target)

  return (
    surface !== null && !pointerPressedSurfaces.has(surface)
  )
}

export default isTapSurfaceEvent
