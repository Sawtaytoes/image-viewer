import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Renderer build: React Fast Refresh + Tailwind v4.
//
// `jsxImportSource: "@emotion/react"` is gone. Emotion's `css` prop needed JSX
// routed through `@emotion/react/jsx-runtime`; the styling is Tailwind
// utilities on `className` now, so JSX goes back through React's own runtime
// and the renderer ships one less runtime library. See
// `docs/2026-07-31-m6c-typescript-and-tailwind.md`.
//
// `@tailwindcss/vite` rather than a PostCSS pass: it is the first-party v4
// plugin, it is what rip-deck and mux-magic use, and it needs no
// `postcss.config.*` to exist at all.
//
// `resolve.dedupe: ["react", "react-dom"]` — this WAS deliberately absent while
// the app consumed only `@charcuterie/tokens` (CSS + plain values, no React).
// It is required now that `@charcuterie/ui@2.x` is in the graph: `ui` is a real
// React component library (Menu/Dialog/Tooltip/…), and however React resolves on
// a given machine — a registry install, a `portal:` link to a local charcuterie
// checkout, or a second copy Vite's dep optimizer pre-bundles for `ui` — a
// SECOND React makes `@vitejs/plugin-react`'s Fast Refresh throw "can't detect
// preamble" (the preamble sets the refresh globals on one React; the component
// runs against the other), and the renderer mounts nothing → a blank window.
// Deduping forces a single React; it is a no-op when there is already only one.
// Mirror any change in `vitest.config.ts`.
// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
})
