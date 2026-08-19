# Router everywhere, history per origin

**Status:** Accepted
**Date:** 2026-08-16
**Type:** Architecture / frontend
**Supersedes:** —
**Superseded by:** —

## The rule

The renderer routes with **react-router**, like every other app the owner owns
(fleet decision `2026-08-16-owned-web-apps-use-react-router-with-path-urls`).

**The history is chosen at runtime from `location.protocol`:**

| Origin | History | Why |
| --- | --- | --- |
| `http:` / `https:` — browser mode, `yarn dev:browser` | `BrowserRouter` | a server is there to answer a path |
| `file:` — the packaged Electron window | hash history | there is no server, and no file at `/settings` either |

Same library, same route table, same `<Link>`s. **Only the history differs, and only
here.** `src/routing/AppRouter.tsx` is the one place that knows.

## What was rejected

**"Use `BrowserRouter` everywhere, like the rest of the fleet."** It cannot work in the
packaged app. `src/main.js` loads the renderer with `mainWindow.loadFile(...)`, so the
window's origin is `file://`: there is no server to answer `/settings`, and a
`pushState` URL does not survive a reload because no file exists at that path.

**And it fails silently, which is the dangerous part.** `BrowserRouter` under `file://`
does not throw on mount. The app comes up looking fine and the damage shows later, in
links that go nowhere.

**"Skip this app, it's Electron."** Rejected by the owner directly — asked whether to
carve it out or route it per-origin, he chose **"Router everywhere, history
per-origin"** (2026-08-16).

## The server half: browser mode's SPA fallback

A path history is only half a path router — the server has to answer an unknown
path with the app's own HTML, and the fleet rule says that flip ships in the
**same change** as the router. Browser mode's server is the Vite dev server, and
its stock fallback was **actively wrong** here, not merely missing:

- Vite falls back to **`index.html`** — the *Electron* entry, whose
  `/src/renderer.tsx` assumes the preload bridge already put `window.api` there.
- Browser mode's entry is **`index.browser.html`** → `/src/browserEntry.tsx`,
  which installs a fake `window.api` *first*.

So the route table's catch-all redirected `/index.browser.html` → `/`, and the
next reload on `/` served the Electron document: the app came up **blank** with
`Cannot read properties of undefined (reading 'fullScreen')`. Nothing 404s, so
no status code betrays it.

`vite.browserModeSpaFallback.ts` rewrites navigations (`Accept: text/html`, GET
or HEAD) to `/index.browser.html`.

**A fallback must not swallow the rest of the server.** This middleware has to run
*before* Vite's static/transform middlewares — that is the only way to beat Vite's
own html-fallback to the request — and that ordering is the hazard. A browser's
top-level navigation `Accept` is
`text/html,…,image/avif,image/webp,…,*/*;q=0.8`, so "rewrite everything that
accepts `text/html`" also matches images, source modules and JSON. The first cut
of this plugin did exactly that, and navigating to `/src/browserEntry.tsx`
returned the *app* instead of the file. **A path that used to return a file and
now returns HTML is a regression even though it still answers 200** — no status
code betrays it, which is the same trap as the original bug.

So the fallback only claims paths that could plausibly be a route. It skips
Vite's `/@…` namespace (`/@vite/client`, `/@fs/…`, `/@id/…`), its `/__…`
internal endpoints (`/__vite_ping`, `/__open-in-editor`), and **anything with a
file extension** — the last-segment-contains-a-dot rule
`connect-history-api-fallback` uses. That last one is what keeps every static
file, every source module and `/index.html` itself reachable.

The gate is not "does a deep link 200". It is "does every non-route path still
return what it used to". Verified by enumerating every path the dev server
mounts with a real navigation `Accept` header and diffing status + content-type +
body with the fallback off vs on: exactly four paths change (`/`, `/settings`,
`/deep/link/test`, `/q/42` — all genuine routes) and everything else is
byte-identical. `vite.browserModeSpaFallback.test.ts` pins that list.

It is gated on `IMAGE_VIEWER_BROWSER_MODE`, set only by `yarn dev:browser`,
because `vite.renderer.config.ts` also drives `electron-forge start` — whose dev
server must keep serving `index.html`, since that window has the **real** preload
bridge — and `yarn build:renderer` / the packaged build, where `index.html` is
the entry Electron `loadFile`s. `apply: "serve"` keeps it out of builds as well.

## Open: item 4 of the fleet decision (real `<Link>`/`<a href>`) is NOT satisfied

The fleet decision has four parts. This change delivers 1–3 (react-router, a
`<Routes>` table, path URLs under http). **Item 4 — "navigation is a real
`<Link>`/`<a href>` so middle-click, ⌘-click and 'copy link address' keep
working" — is not met, and saying so is the point of this section.**

Measured 2026-08-19 in browser mode, not inferred: entering a folder gives the
URL `/?filePath=%2FCats`, so folder navigation **is** addressable — and yet the
page has **zero** `a[href]` elements. Every control is a `<button>` with no
`href`. Ctrl+clicking an ancestor breadcrumb rung opens no tab (1 page before,
1 after). The breadcrumb ancestors are the sharpest case: they were deliberately
given a persistent link affordance so they *read* as links
(`2026-08-11`, `text-intent-accent-content` + hover underline), and they are not
links.

This is **pre-existing**, not introduced here — this change touches no component
at all (`git diff … -- src/components/` is empty). Recording it because
"the router landed" must not be mistaken for "item 4 is done".

Why it is not fixed in the same change, unlike the rest of item 3's fallback:

- **It is the route-#2 decision wearing a different hat.** Folder position lives
  in a `?filePath=` query owned by `FileSystemProvider`'s raw `replaceState`, not
  in the route table, which has exactly one route. Giving the rungs a real `href`
  means first deciding whether a folder is a route (`/browse/*`) or router-owned
  search state — the same call as the follow-up below, and the owner has not been
  asked it.
- **The Electron half cannot be tested here.** `src/main.js` has no
  `setWindowOpenHandler` and no `will-navigate` guard, so a `file://` renderer
  has nothing catching a link click that escapes `preventDefault` — it would
  navigate the window to a path with no file behind it. Verifying that needs the
  packaged app, and `electron-forge package` cannot download the Electron binary
  in this sandbox. Shipping anchors provable in only one of the two origins is
  the exact mistake that produced the blank-page bug above.

When it is taken up: `@charcuterie/ui` (this app is on 2.11.0) already exports
`ButtonLink` and `RouterLinkProvider`, so `<RouterLinkProvider link={Link}>` at
the root is the wiring. Use react-router's `<Link>` rather than a hand-rolled
`<a onClick>`: it calls `preventDefault` **only** for unmodified left clicks, so
ctrl/⌘/middle clicks fall through to the browser. A hand-rolled handler that
calls `preventDefault()` on every click renders pixel-identically and still fails
the ctrl+click test — screenshots cannot catch this, only ctrl+click can.

## Known follow-up: `FileSystemProvider` writes history behind the router's back

`src/components/fileBrowser/FileSystemProvider.tsx` syncs the current folder into
the URL with a raw `window.history.replaceState(null, "", "?…")`, outside
react-router. With **one** route that is harmless — and it is pre-existing, not
introduced with the router.

It is a trap for the *second* route, though, and specifically under the hash
history: `replaceState` with a relative `?query` drops the fragment, so a
`#/settings` route would be silently erased from the address bar (no `hashchange`
fires, so the in-memory router never notices and only a reload reveals it).
Whoever adds route #2 converts this to the router's own `useSearchParams`
(`{ replace: true }`) in that change.

## How to honor it

- Add routes to the table in `src/renderer.tsx`. Never import `BrowserRouter` or
  `HashRouter` anywhere else — go through `AppRouter`.
- Never navigate with raw `history.pushState`/`replaceState`. Use the router, or
  the hash history loses the route (see the follow-up above).
- The check is on `protocol`, **not** a build flag and not `window.api`, because what
  actually decides is what the window was loaded from. A packaged build served over http
  would want a path history and would get one.
- `src/routing/AppRouter.test.tsx` pins both branches by asserting the **rendered
  `href`**, which is the thing that has to differ. That test is the only automatic check
  of the `file://` half — the packaged renderer needs the preload bridge, so it cannot be
  loaded in a bare browser, and Playwright cannot cover it.

## Evidence

> "Points-Market, Board Game Picker, and QueuePilot, Rip-Deck, CastKit, Image-Viewer,
> and the others need browser routing. I want them all the same" (owner, 2026-08-16)

Verified 2026-08-16: browser mode driven for real at `http://localhost:5175/index.browser.html`
— the app mounts under the router, renders its folder grid, throws no page errors, and the
URL carries no `#`. The `file://` branch is covered by the two `AppRouter` tests. `tsc`,
`biome check`, `eslint` and `build:renderer` all pass; the suite is 144 passing with the
same 2 `ColorSchemeControl` failures that are already red on `master`.

**Both origins driven for real, 2026-08-19** (review of #28):

- **http** — the reload that the initial version of this change broke. Loading
  `/index.browser.html` left the URL at `/?filePath=%2F`, and reloading there served the
  Electron document: blank page, `window.api` undefined
  ([before](../previews/2026-08-19-browser-routing-reload-before.png)). With the SPA
  fallback above, the same reload and a cold deep link at `/deep/link/test` both render
  the folder grid with no page errors and no `#`
  ([after](../previews/2026-08-19-browser-routing-reload-after.png)).
- **`file://`** — the browser entry built as a production bundle with relative asset URLs
  and opened at `file:///…/index.browser.html`. The app mounts and renders with no page
  errors ([shot](../previews/2026-08-19-browser-routing-file-origin-after.png)). Forcing
  the other branch (making `isFileOrigin()` return `false`) at the same URL blanks the app
  with `SecurityError: Failed to execute 'replaceState' … URL 'file:///' cannot be
  created`, which is the direct proof that the hash history is load-bearing rather than
  precautionary. Real packaged Electron could not be launched here — `electron-forge
  package` cannot download the Electron binary in this sandbox — so the origin is genuine
  and the bundle is the production one, but the preload bridge is browser mode's stand-in.
