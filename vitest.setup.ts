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
