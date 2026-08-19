import type { ReactNode } from "react"
import { BrowserRouter, HashRouter } from "react-router"

/**
 * The router, with its history chosen per ORIGIN.
 *
 * Every app the owner owns routes with react-router and path URLs
 * (fleet decision `2026-08-16-owned-web-apps-use-react-router-with-path-urls`).
 * This one cannot keep the second half of that everywhere, and the reason is the
 * origin rather than the app:
 *
 * - **Browser mode** (`yarn dev:browser`, `index.browser.html`) is served over
 *   http by Vite. Path URLs work, so `BrowserRouter`.
 * - **Electron** loads the packaged renderer with `mainWindow.loadFile(...)`
 *   (`src/main.js`), so the window's origin is `file://`. `BrowserRouter` cannot
 *   work there: there is no server to answer `/settings`, and a `pushState` URL
 *   does not survive a reload — the file at that path simply does not exist.
 *   So: a hash history.
 *
 * The owner settled this explicitly on 2026-08-16 — "router everywhere, history
 * per-origin". Same library, same route table, same `<Link>`s everywhere in the
 * app; only which history backs them differs, and only here.
 *
 * The check is `protocol`, not a build flag or `window.api`, because the thing
 * that actually decides is what the window was loaded from. A packaged build
 * served over http would want `BrowserRouter` and would get it; a dev build
 * opened from disk would want the hash and would get that.
 */
const isFileOrigin = () =>
  typeof window !== "undefined" &&
  window.location.protocol === "file:"

export const AppRouter = ({
  children,
}: {
  children: ReactNode
}) => {
  const Router = isFileOrigin() ? HashRouter : BrowserRouter

  return <Router>{children}</Router>
}
