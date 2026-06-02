import { defineConfig } from "vite"

// Main process build. The Electron Forge Vite plugin injects the
// `MAIN_WINDOW_VITE_*` constants and externalizes electron + node builtins,
// so this config stays minimal.
// https://vitejs.dev/config
export default defineConfig({})
