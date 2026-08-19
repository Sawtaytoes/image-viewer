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
 * ## What must NOT be swallowed
 *
 * This middleware runs BEFORE Vite's static/transform middlewares, which is the
 * only way to beat Vite's own html-fallback to the request. That ordering is
 * also the hazard: an unguarded "rewrite every `text/html` request" shadows
 * every real path on the server, because a browser's top-level navigation Accept
 * header (`text/html,…,image/avif,…,*​/*;q=0.8`) matches images, source modules
 * and JSON alike. A path that used to return a file and now returns the app is a
 * regression even though it still answers 200.
 *
 * So the fallback only claims paths that could plausibly be a ROUTE:
 *
 * - **`/@…`** — Vite's own namespace (`/@vite/client`, `/@fs/…`, `/@id/…`).
 * - **`/__…`** — Vite's internal endpoints (`/__vite_ping`, `/__open-in-editor`),
 *   plus anything a plugin mounts under the same reserved prefix.
 * - **anything with a file extension** — `/src/browserEntry.tsx`,
 *   `/assets/index.css`, `/favicon.ico`, and `/index.html` itself, which must
 *   keep serving the Electron entry rather than being quietly swapped. This is
 *   the same last-segment-contains-a-dot rule `connect-history-api-fallback`
 *   uses, and it is what keeps every static file reachable.
 *
 * Everything left — `/`, `/settings`, `/deep/link` — is a route, and gets the
 * browser entry.
 */
export const browserModeSpaFallback = (): Plugin => ({
  apply: "serve",
  configureServer: (server) => {
    server.middlewares.use((request, _response, next) => {
      if (isAppRouteRequest(request)) {
        request.url = browserEntryUrl
      }

      next()
    })
  },
  name: "image-viewer:browser-mode-spa-fallback",
})

export const browserEntryUrl = "/index.browser.html"

const reservedPrefixes = ["/@", "/__"]

export const isAppRouteRequest = ({
  headers,
  method,
  url,
}: {
  headers: { accept?: string }
  method?: string
  url?: string
}) => {
  if (method !== "GET" && method !== "HEAD") {
    return false
  }

  if (!headers.accept?.includes("text/html")) {
    return false
  }

  // Query/hash are not part of the path decision: `/?filePath=%2F` is the root
  // route, and `/a.png?v=2` is still a file.
  const pathname = (url ?? "").split(/[?#]/)[0]

  if (
    reservedPrefixes.some((prefix) =>
      pathname.startsWith(prefix),
    )
  ) {
    return false
  }

  const lastSegment = pathname.slice(
    pathname.lastIndexOf("/") + 1,
  )

  return !lastSegment.includes(".")
}
