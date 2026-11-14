// A tap surface is a `<button>` that stands where a clickable `<div>` used to:
// a gallery tile, a folder tab, the viewer's center zone, the empty pane. Each
// carries `data-tap-surface`.
//
// A button keeps focus after a click, and Enter on a focused button clicks it.
// The window-level shortcuts already give Enter a meaning (open the gallery's
// keyboard selection, or leave the viewer), and they ran alone when these
// surfaces were `<div>`s. A shortcut that handles Enter calls `preventDefault()`
// when this returns true, which cancels the button's click, so Enter still does
// one thing. Space, which no shortcut uses, still clicks the focused surface.
const isTapSurfaceEvent = (event: KeyboardEvent) =>
  event.target instanceof Element &&
  event.target.closest("[data-tap-surface]") !== null

export default isTapSurfaceEvent
