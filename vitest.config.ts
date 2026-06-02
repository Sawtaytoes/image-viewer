import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Vitest uses the same React + Emotion transform as the renderer build so the
// `css` prop and JSX work identically in tests.
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.js"],
  },
})
