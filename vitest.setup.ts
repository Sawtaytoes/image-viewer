import "@testing-library/jest-dom/vitest"

// Most suites run in jsdom and get the renderer setup: the `window.api` stub
// and the jsdom shims. The Node-side programs (main, preload, and the HEIC
// worker) are tested in the Node environment (`// @vitest-environment node`),
// which has no `window` to stub, and where Node's own `AbortSignal` and
// `ArrayBuffer` are the ones `fs` and Electron expect.
if (typeof window !== "undefined") {
  await import("./vitest.setup.renderer")
}
