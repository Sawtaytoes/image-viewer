import { defineConfig } from "vite"

// Main process build. The Electron Forge Vite plugin injects the
// `MAIN_WINDOW_VITE_*` constants and externalizes electron + node builtins,
// so this config stays minimal.
//
// `heic-convert` (with its libheif decoder) is bundled into the main build
// rather than externalized: Forge's Vite plugin packs only `.vite/build` into
// the app.asar and drops node_modules, so an external dependency would be
// missing at runtime. The libheif `wasm-bundle` heic-decode uses inlines its
// WASM as base64 (no sidecar `.wasm` file to load), so it bundles cleanly. See
// docs/workers/feature-heic-support.md.
// https://vitejs.dev/config
export default defineConfig({})
