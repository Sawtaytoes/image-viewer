import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Renderer build. React Fast Refresh + Emotion's `css` prop via
// `jsxImportSource` (routes JSX through @emotion/react/jsx-runtime). The Vite 8
// / oxc build of @vitejs/plugin-react no longer accepts a `babel` option, so the
// optional @emotion/babel-plugin (labels/sourcemaps) is dropped.
// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
    }),
  ],
})
