import "@testing-library/jest-dom/vitest"

import type { ImageFile, QueuedFolder } from "./src/types"

// Minimal stub of the preload bridge (`window.api`). Renderer modules read
// `window.api` at import time, so it must exist before any test imports them.
// Individual tests can override fields as needed.
//
// It is typed as the real `Window["api"]` rather than left inferred, which is
// the one thing the `.js` version could not do — and that immediately found two
// holes: `readImageData` was absent from the stub entirely, and `preload.d.ts`
// had never been told about `fullScreen`, `searchFolders` or the four
// saved-queue members that `preload.js` has exposed for weeks.
const extname = (filePath: string) => {
  const base = filePath.slice(
    Math.max(
      filePath.lastIndexOf("/"),
      filePath.lastIndexOf("\\"),
    ) + 1,
  )
  const dotIndex = base.lastIndexOf(".")

  return dotIndex > 0 ? base.slice(dotIndex) : ""
}

const api: Window["api"] = {
  cliFilePath: "",
  countFolderImages: () => Promise.resolve(0),
  createNewWindow: () => {},
  deleteFilePath: () => Promise.resolve(true),
  findFirstImage: () =>
    Promise.resolve<ImageFile | null>(null),
  fullScreen: {
    get: () => Promise.resolve(false),
    onChanged: () => () => {},
    toggle: () => Promise.resolve(false),
  },
  getDisplays: () => Promise.resolve([]),
  getFolderLastIndex: () => Promise.resolve(null),
  getWindowsDrives: () => [],
  identifyDisplay: () => {},
  isSpawnedViewer: false,
  openFolders: {
    get: () => Promise.resolve([]),
    onChanged: () => () => {},
    set: () => {},
  },
  queue: {
    add: (folder: QueuedFolder) => Promise.resolve(folder),
    addMany: () => Promise.resolve([]),
    clear: () => {},
    get: () => Promise.resolve([]),
    hasSaved: () => Promise.resolve(false),
    load: () => Promise.resolve([]),
    onChanged: () => () => {},
    onSavedChanged: () => () => {},
    remove: () => {},
    save: () => Promise.resolve(true),
  },
  readDirectory: () => Promise.resolve([]),
  // An empty PNG-shaped payload rather than a rejection: the loader turns this
  // into a `Blob`, and a test that renders an image should exercise that path
  // rather than the error branch.
  readImageData: () =>
    Promise.resolve({
      data: new ArrayBuffer(0),
      mimeType: "image/png",
    }),
  searchFolders: () => Promise.resolve([]),
  setFolderLastIndex: () => {},
  stopIdentifyDisplay: () => {},
  statPath: () => ({
    exists: false,
    isDirectory: false,
    isFile: false,
  }),
  path: {
    basename: (filePath: string) =>
      filePath.slice(
        Math.max(
          filePath.lastIndexOf("/"),
          filePath.lastIndexOf("\\"),
        ) + 1,
      ),
    dirname: (filePath: string) =>
      filePath.slice(
        0,
        Math.max(
          filePath.lastIndexOf("/"),
          filePath.lastIndexOf("\\"),
        ),
      ) || ".",
    extname,
    join: (...segments: string[]) => segments.join("/"),
    resolve: (...segments: string[]) => segments.join("/"),
    sep: "/",
  },
}

window.api = api

// jsdom lacks ResizeObserver, which FileBrowser instantiates.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom lacks IntersectionObserver, which Image uses for lazy loading. The stub
// never reports visibility, so test-rendered images simply don't start loading.
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class FakeIntersectionObserver
    implements IntersectionObserver
  {
    readonly root = null
    readonly rootMargin = ""
    readonly scrollMargin = ""
    readonly thresholds: readonly number[] = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
}

// jsdom implements `<dialog>` as an element but not as a *dialog*: it parses
// the tag and then leaves `showModal`, `close` and the top layer unimplemented.
// `@charcuterie/ui`'s `Modal` is a real `<dialog>` driven by `showModal()`, so
// without this every test that renders one dies with
// `dialogElement.showModal is not a function` — inside a passive effect, which
// surfaces as an unrelated-looking failure in whichever test happened to mount
// the tree.
//
// The shim is deliberately the smallest thing that is still *true*: `open` and
// the `close` event are what a test can observe, so those are real. It does not
// pretend to have a focus trap, a top layer or `::backdrop` — jsdom computes no
// styles and traps no focus, so faking those would only let a test assert
// behaviour the browser owns and this environment cannot check.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal =
    function showModal() {
      this.open = true
    }

  HTMLDialogElement.prototype.show = function show() {
    this.open = true
  }

  HTMLDialogElement.prototype.close = function close(
    returnValue?: string,
  ) {
    this.open = false

    if (returnValue !== undefined) {
      this.returnValue = returnValue
    }

    this.dispatchEvent(new Event("close"))
  }
}

// jsdom does not implement the Popover API either, and `@charcuterie/ui`'s
// `Menu` is built on it — `showPopover()` on the panel, plus a
// `matches(":popover-open")` guard so it is never called twice.
//
// Both halves have to be shimmed, and the selector is the half that is easy to
// miss: `:popover-open` is not a selector jsdom's parser knows, so
// `matches()` *throws* on it rather than returning `false`, which turns the
// guard itself into the crash. `matches` is therefore wrapped to answer that
// one selector from the shim's own state and defer everything else to the real
// implementation.
//
// Like the `<dialog>` shim above, this models only what a test can observe:
// which element is open. The top layer, light-dismiss and `::backdrop` are the
// browser's, and jsdom has no rendering to hang them on.
const openPopovers = new WeakSet<HTMLElement>()

if (!HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover =
    function showPopover() {
      openPopovers.add(this)
    }

  HTMLElement.prototype.hidePopover =
    function hidePopover() {
      openPopovers.delete(this)
    }

  HTMLElement.prototype.togglePopover =
    function togglePopover(
      options?: boolean | { force?: boolean },
    ) {
      const isForced =
        typeof options === "boolean"
          ? options
          : options?.force

      const shouldOpen = isForced ?? !openPopovers.has(this)

      if (shouldOpen) {
        openPopovers.add(this)
      } else {
        openPopovers.delete(this)
      }

      return shouldOpen
    }

  const originalMatches = Element.prototype.matches

  // `defineProperty` rather than a plain assignment, and not for style:
  // `Element.prototype.matches` is declared as four overloads, three of which
  // are `this is HTMLElementTagNameMap[K]` type predicates. A `(selectors:
  // string) => boolean` is not assignable to that (TS2322), so a direct
  // assignment needs an `as` cast to compile. `defineProperty`'s `value` is
  // untyped, which lets the wrapper keep its honest signature.
  Object.defineProperty(Element.prototype, "matches", {
    configurable: true,
    value: function matches(
      this: Element,
      selectors: string,
    ) {
      if (selectors === ":popover-open") {
        return openPopovers.has(this as HTMLElement)
      }

      return originalMatches.call(this, selectors)
    },
    writable: true,
  })
}

// …and the last piece, which is the one that fails most confusingly. jsdom's UA
// stylesheet carries
//
//   [popover]:not(:popover-open):not(dialog[open]) { display: none }
//
// and the `matches` wrapper above cannot reach the cascade — it answers
// `element.matches(":popover-open")` for `Menu`'s own guard, while jsdom's style
// engine still cannot evaluate the selector and so keeps the rule matched. The
// panel therefore renders, with the right role and the right children, and
// `getByRole("menu")` reports "Unable to find role=menu": Testing Library
// filters on `display: none` and the element is computed-hidden.
//
// An author rule with `!important` outranks the UA rule and is narrow enough to
// affect nothing else — the alternative is `{ hidden: true }` on every menu
// query in the suite, which would also make those queries blind to an element
// that really was hidden.
const popoverVisibilityStyle =
  document.createElement("style")

popoverVisibilityStyle.textContent =
  "[popover] { display: block !important; }"

document.head.appendChild(popoverVisibilityStyle)
