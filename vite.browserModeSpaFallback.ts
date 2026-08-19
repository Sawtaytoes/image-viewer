import type { Plugin } from "vite"

/**
 * Browser mode's SPA fallback — the server half of the router.
 *
 * `src/renderer.tsx` renders a real route table, and under http it is backed by
 * `BrowserRouter` (`src/routing/AppRouter.tsx`). A path router needs the server
 * to answer an unknown path with the app's own HTML, or the first reload on a
 * deep link lands somewhere else. That is the fleet rule, and it says the
 * fallback ships in the SAME change as the router
 * (`2026-08-16-owned-web-apps-use-react-router-with-path-urls`).
 *
 * Vite already has an SPA fallback, but it serves `index.html` — the ELECTRON
 * entry, whose `/src/renderer.tsx` assumes the preload bridge already put
 * `window.api` there. Browser mode's entry is `index.browser.html`
 * (`/src/browserEntry.tsx`, which installs a fake `window.api` first). So the
 * stock fallback is not merely unhelpful here, it is actively WRONG: the route
 * table's catch-all redirects `/index.browser.html` to `/`, and a reload on `/`
 * then served the Electron document, so the app came up BLANK with
 * `Cannot read properties of undefined (reading 'fullScreen')`. Nothing 404s,
 * which is why this had to be caught by hand rather than by a status code.
 *
 * Only navigations are rewritten. Module and asset requests ask for `*​/*`;
 * navigations ask for `text/html`. That keeps `/src/…`, `/@vite/…`,
 * `/node_modules/…` and every asset resolving normally, which matters because
 * the rewritten document immediately asks for `/src/browserEntry.tsx`.
 */
export const browserModeSpaFallback = (): Plugin => ({
  apply: "serve",
  configureServer: (server) => {
    // Registered from the body of `configureServer`, not from its returned
    // callback, so it runs BEFORE Vite's own html-fallback middleware and wins.
    server.middlewares.use((request, _response, next) => {
      if (isNavigationRequest(request)) {
        request.url = browserEntryUrl
      }

      next()
    })
  },
  name: "image-viewer:browser-mode-spa-fallback",
})

export const browserEntryUrl = "/index.browser.html"

export const isNavigationRequest = ({
  headers,
  method,
}: {
  headers: { accept?: string }
  method?: string
}) =>
  (method === "GET" || method === "HEAD") &&
  Boolean(headers.accept?.includes("text/html"))
