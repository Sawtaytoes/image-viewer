import { describe, expect, test, vi } from "vitest"

import {
  browserEntryUrl,
  browserModeSpaFallback,
  isNavigationRequest,
} from "./vite.browserModeSpaFallback"

/**
 * The bug this pins: browser mode's deep-link reload used to serve the ELECTRON
 * document (`index.html`), so the app came up blank with `window.api`
 * undefined. Vite's stock fallback points at the wrong entry, and it answers
 * 200 while doing it, so nothing downstream can notice.
 *
 * The dev server itself is not worth booting here — the contract is "which
 * requests get rewritten", and that is this middleware's decision alone.
 */

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

describe("browserModeSpaFallback", () => {
  test("never runs in a build — it is a dev-server concern", () => {
    expect(browserModeSpaFallback().apply).toBe("serve")
  })

  test("a navigation is rewritten to the BROWSER entry, not index.html", () => {
    const { next, request } = runMiddleware({
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
      method: "GET",
      url: "/deep/link",
    })

    expect(request.url).toBe(browserEntryUrl)
    expect(next).toHaveBeenCalled()
  })

  test("the root path is rewritten too — that is where the router lands", () => {
    const { request } = runMiddleware({
      headers: { accept: "text/html" },
      method: "GET",
      url: "/?filePath=%2F",
    })

    expect(request.url).toBe(browserEntryUrl)
  })

  test("a module request is left alone, or the entry cannot load", () => {
    const { request } = runMiddleware({
      headers: { accept: "*/*" },
      method: "GET",
      url: "/src/browserEntry.tsx",
    })

    expect(request.url).toBe("/src/browserEntry.tsx")
  })

  test.each([
    [
      "a stylesheet",
      "text/css,*/*;q=0.1",
      "/assets/index.css",
    ],
    [
      "an image",
      "image/avif,image/webp,*/*",
      "/assets/cat.png",
    ],
    [
      "a font",
      "font/woff2,*/*",
      "/assets/source-sans.woff2",
    ],
  ])("%s is left alone", (_label, accept, url) => {
    const { request } = runMiddleware({
      headers: { accept },
      method: "GET",
      url,
    })

    expect(request.url).toBe(url)
  })

  test("a non-GET/HEAD request is left alone", () => {
    expect(
      isNavigationRequest({
        headers: { accept: "text/html" },
        method: "POST",
      }),
    ).toBe(false)
  })

  test("a request with no accept header is left alone", () => {
    expect(
      isNavigationRequest({ headers: {}, method: "GET" }),
    ).toBe(false)
  })
})
