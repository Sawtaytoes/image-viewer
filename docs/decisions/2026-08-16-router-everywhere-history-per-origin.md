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

## How to honor it

- Add routes to the table in `src/renderer.tsx`. Never import `BrowserRouter` or
  `HashRouter` anywhere else — go through `AppRouter`.
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
