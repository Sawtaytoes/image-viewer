import { describe, expect, test, vi } from "vitest"

import {
  browserEntryUrl,
  browserModeSpaFallback,
  isAppRouteRequest,
} from "./vite.browserModeSpaFallback"

/**
 * Two bugs are pinned here.
 *
 * 1. Browser mode's deep-link reload used to serve the ELECTRON document
 *    (`index.html`), so the app came up blank with `window.api` undefined.
 *    Vite's stock fallback points at the wrong entry and answers 200 while
 *    doing it, so nothing downstream can notice.
 *
 * 2. The fix must not swallow the rest of the server. This middleware runs
 *    before Vite's static/transform middlewares, and a browser's top-level
 *    navigation Accept header matches images and modules too — so an unguarded
 *    rewrite turns every real path into the app. A path that used to return a
 *    file and now returns HTML is a regression even at 200.
 *
 * The dev server is not booted: the contract is "which requests get rewritten",
 * and that is this middleware's decision alone.
 */

const navigationAccept =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"

const runMiddleware = (
  request: Record<string, unknown>,
) => {
  const plugin = browserModeSpaFallback()
  const next = vi.fn()
  let middleware: (
    request: unknown,
    response: unknown,
    next: () => void,
  ) => void = () => undefined

  const server = {
    middlewares: {
      use: (handler: typeof middleware) => {
        middleware = handler
      },
    },
  }

  // biome-ignore lint/suspicious/noExplicitAny: the hook's full Vite server type is irrelevant to this unit.
  ;(plugin.configureServer as any)(server)

  middleware(request, {}, next)

  return { next, request }
}

const isRoute = (url: string, accept = navigationAccept) =>
  isAppRouteRequest({
    headers: { accept },
    method: "GET",
    url,
  })

describe("browserModeSpaFallback", () => {
  test("never runs in a build — it is a dev-server concern", () => {
    expect(browserModeSpaFallback().apply).toBe("serve")
  })

  test("a deep link is rewritten to the BROWSER entry, not index.html", () => {
    const { next, request } = runMiddleware({
      headers: { accept: navigationAccept },
      method: "GET",
      url: "/deep/link",
    })

    expect(request.url).toBe(browserEntryUrl)
    expect(next).toHaveBeenCalled()
  })

  test("the root path is rewritten too — that is where the router lands", () => {
    const { request } = runMiddleware({
      headers: { accept: navigationAccept },
      method: "GET",
      url: "/?filePath=%2F",
    })

    expect(request.url).toBe(browserEntryUrl)
  })

  test.each([
    "/",
    "/settings",
    "/deep/link/test",
    "/q/42",
  ])("%s is a route", (url) => {
    expect(isRoute(url)).toBe(true)
  })

  /**
   * The regression guard. Every one of these answers 200 either way, so only an
   * explicit check catches a fallback that has started shadowing the server.
   */
  test.each([
    ["the Electron entry", "/index.html"],
    ["the browser entry itself", "/index.browser.html"],
    ["a source module", "/src/browserEntry.tsx"],
    ["a stylesheet", "/assets/index-Bmn23a2b.css"],
    ["a script", "/assets/index-Cs94s3OH.js"],
    ["a sourcemap", "/assets/index-Cs94s3OH.js.map"],
    ["a font", "/assets/source-sans-pro.woff2"],
    ["a favicon", "/favicon.ico"],
    ["a versioned asset", "/assets/logo.png?v=2"],
    [
      "a prebundled dep",
      "/node_modules/.vite/deps/react.js",
    ],
    ["Vite's client", "/@vite/client"],
    ["Vite's fs escape hatch", "/@fs/tmp/x/index.js"],
    ["Vite's id namespace", "/@id/__x00__virtual"],
    ["Vite's ping endpoint", "/__vite_ping"],
    ["Vite's open-in-editor", "/__open-in-editor"],
  ])("%s is NOT swallowed by the fallback", (_label, url) => {
    expect(isRoute(url)).toBe(false)
  })

  test("a module request is left alone even on a route-shaped path", () => {
    const { request } = runMiddleware({
      headers: { accept: "*/*" },
      method: "GET",
      url: "/some/route",
    })

    expect(request.url).toBe("/some/route")
  })

  test("a non-GET/HEAD request is left alone", () => {
    expect(
      isAppRouteRequest({
        headers: { accept: navigationAccept },
        method: "POST",
        url: "/settings",
      }),
    ).toBe(false)
  })

  test("a request with no accept header is left alone", () => {
    expect(
      isAppRouteRequest({
        headers: {},
        method: "GET",
        url: "/settings",
      }),
    ).toBe(false)
  })
})
