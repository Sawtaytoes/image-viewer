import "@testing-library/jest-dom/vitest"

// Minimal stub of the preload bridge (window.api). Renderer modules read
// window.api at import time, so it must exist before any test imports them.
// Individual tests can override fields as needed.
const extname = (filePath) => {
  const base = filePath.slice(
    Math.max(
      filePath.lastIndexOf("/"),
      filePath.lastIndexOf("\\"),
    ) + 1,
  )
  const dotIndex = base.lastIndexOf(".")

  return dotIndex > 0 ? base.slice(dotIndex) : ""
}

window.api = {
  cliFilePath: "",
  countFolderImages: () => Promise.resolve(0),
  createNewWindow: () => {},
  deleteFilePath: () => Promise.resolve(true),
  findFirstImage: () => Promise.resolve(null),
  getWindowsDrives: () => [],
  readDirectory: () => Promise.resolve([]),
  statPath: () => ({
    exists: false,
    isDirectory: false,
    isFile: false,
  }),
  path: {
    basename: (filePath) =>
      filePath.slice(
        Math.max(
          filePath.lastIndexOf("/"),
          filePath.lastIndexOf("\\"),
        ) + 1,
      ),
    dirname: (filePath) =>
      filePath.slice(
        0,
        Math.max(
          filePath.lastIndexOf("/"),
          filePath.lastIndexOf("\\"),
        ),
      ) || ".",
    extname,
    join: (...segments) => segments.join("/"),
    resolve: (...segments) => segments.join("/"),
    sep: "/",
  },
}

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
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
