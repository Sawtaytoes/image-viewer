import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Vitest uses the same React transform as the renderer build so JSX behaves
// identically in tests.
//
// No `@tailwindcss/vite` here, deliberately. jsdom does not compute styles from
// a stylesheet the way a browser does, so generating the utilities would cost a
// Tailwind pass per run and prove nothing: a `className` assertion reads the
// attribute, which is present with or without the CSS. The gate that CAN see a
// missing utility is `yarn build:renderer`, and that runs the real plugin.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
})
