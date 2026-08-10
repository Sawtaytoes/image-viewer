import { createViteConfig } from "@charcuterie/vite-config"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

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
// `resolve.dedupe` is deliberately absent — the rip-deck/castkit configs carry
// it because they consume `@charcuterie/ui` through a `portal:` symlink, and
// two Reacts is what that produces. This app depends only on
// `@charcuterie/tokens`, which is CSS and plain values with no React at all.
// PHASE 2 adds `@charcuterie/ui`; if it is ever linked rather than installed
// from the registry, add `resolve: { dedupe: ["react", "react-dom"] }` here and
// in `vitest.config.ts`.
// https://vitejs.dev/config
export default createViteConfig({
  plugins: [react(), tailwindcss()],
})
