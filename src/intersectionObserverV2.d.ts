// IntersectionObserver **v2** — `trackVisibility`, `delay`, and the `isVisible`
// that `components/imageViewer/Image.tsx` has always read.
//
// Chromium ships all three, and this app only ever runs on Chromium (inside
// Electron), but v2 never left the WICG incubation stage, so `lib.dom.d.ts`
// declares none of them.
//
// Declared rather than cast. An `as` at the read site would go on compiling if
// Chromium ever dropped the feature; an interface merge is a claim about the
// runtime, in one place, that reads as one — and `Image.tsx` passing
// `trackVisibility` to a `IntersectionObserverInit` that has no such member is
// then a type error rather than a silently-ignored option.
//
// It lives here, beside `preload.d.ts`, rather than at the top of the component
// that needs it: `declare global` inside a module is legal and reaches the whole
// program, which means a global augmentation would have been sitting in a file
// whose name gives no hint that it changes the DOM types everywhere.
export {}

declare global {
  interface IntersectionObserverEntry {
    // Whether the target is *visibly* on screen — not merely intersecting, but
    // unoccluded and undistorted. Only populated when the observer was
    // constructed with `trackVisibility: true`.
    readonly isVisible: boolean
  }

  interface IntersectionObserverInit {
    // How long (ms) the browser may wait before recomputing visibility.
    // Chromium requires at least 100 whenever `trackVisibility` is on, and
    // throws a `TypeError` otherwise.
    delay?: number
    // The browser's own option name, so the is/has rule does not apply — this
    // is a foreign API's shape, not one we chose.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    trackVisibility?: boolean
  }
}
