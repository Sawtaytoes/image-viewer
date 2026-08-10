import { createViteConfig } from "@charcuterie/vite-config"

// Preload build. Externalization of electron + node builtins is handled by the
// Electron Forge Vite plugin.
// https://vitejs.dev/config
export default createViteConfig()
