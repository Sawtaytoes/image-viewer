# 2026-08-05 — Running the renderer in a plain browser (and headless Electron)

The renderer touches Electron **only** through the `window.api` bridge (no direct
`electron`/`fs`/`path` imports anywhere in `src/components`). That single seam is
what lets the exact same React app run three ways:

1. **The packaged Electron app** — `window.api` comes from `preload.js`.
2. **A plain browser** — `window.api` comes from `src/browserApi.ts` (this doc).
3. **Headless Electron under Xvfb** — the real app, for screenshots in the
   container. See "Headless Electron" below.

Use (2) for a shareable link a human can click (see `devshare` below) or fast
Playwright checks; use (3) when you need the *real* window chrome / OS fullscreen.

## Browser mode

`yarn dev:browser` serves the app on <http://localhost:5175/> — **any** path works,
including <http://localhost:5175/index.browser.html> and a deep link you paste cold.

Moving parts:

- **`vite.browserModeSpaFallback.ts`** — the SPA fallback that makes those paths
  work. The renderer routes with react-router and a path history under http
  (`src/routing/AppRouter.tsx`), so the server has to answer an unknown path with
  the app's HTML. Vite's built-in fallback serves `index.html`, which is the
  *Electron* entry and comes up blank in a browser (no `window.api`), so this
  plugin rewrites navigations to `index.browser.html` instead. It is gated on
  `IMAGE_VIEWER_BROWSER_MODE`, which only `dev:browser` sets — `electron-forge
  start` must keep serving `index.html`. See
  `docs/decisions/2026-08-16-router-everywhere-history-per-origin.md`.

- **`index.browser.html`** — a copy of `index.html` whose only difference is the
  module script: it loads `/src/browserEntry.tsx` instead of `/src/renderer.tsx`.
  The `<html>` axes and first-paint colour-scheme script are pure-browser and
  copied verbatim; keep them in sync with `index.html`.
- **`src/browserEntry.tsx`** — calls `installBrowserApi()` and *then* dynamically
  imports `./renderer`. The dynamic import is load-bearing: the provider tree
  reads `window.api` at module-eval time, so a static import would be hoisted and
  crash before the API exists.
- **`src/browserApi.ts`** — assembles `window.api`:
  - filesystem half → `createFakeFileSystem({ path })` from `src/fakeFileSystem.ts`
    (same sample tree as `IMAGE_VIEWER_FAKE_FS=1`: Cats/Dogs/Landscapes/Abstract,
    real BMP bytes the renderer turns into Blob URLs).
  - `path` → a small pure POSIX implementation (Node's `path` isn't in the browser).
  - `colorScheme` → `matchMedia("(prefers-color-scheme: dark)")` (the T3 preview's
    appearance emulation flips this).
  - `fullScreen` → a **simulated** flag the in-app button toggles and broadcasts,
    exactly like main's `window:fullScreenChanged`. This drives the real
    fullscreen layout (pinned title bar + inset browser) without the browser
    Fullscreen API's embed quirks.
  - `queue` / `openFolders` → in-memory single-window stand-ins.

None of these three files are referenced by the Electron build, so they add zero
runtime to the packaged app.

### Hand a human a link

From a container agent, `devshare` the port rather than exposing it:

```bash
devshare 5175 "image-viewer-browser"
# -> https://image-viewer-browser-XXXX.temp.t3code.octen.dev
# open it at the root — the SPA fallback serves the browser entry on any path
```

Vite 8's dev server accepts the proxied Host as-is (no `allowedHosts` tweak
needed, verified 2026-08-05). The server and the devshare URL are session-scoped.

### Limits

`getDisplays` returns `[]` (no multi-monitor "spawn on display" targets in the
browser) and `createNewWindow` is a no-op. Everything else — browsing, search,
the columns viewer, delete, fullscreen layout, colour-scheme cycling — works.

## Headless Electron (the real app, for screenshots)

The container has `xvfb-run`, the `electron` binary, and Playwright globally at
`/opt/npm-global`. Drive the **real** app with Playwright's Electron API:

```bash
# 1. the built main.js loads http://localhost:5174 — serve the renderer there
node_modules/.bin/vite --config vite.renderer.config.ts --port 5174 --strictPort &
# 2. launch + screenshot under a virtual display (IMAGE_VIEWER_FAKE_FS for content)
xvfb-run -a -s "-screen 0 1600x1000x24" node __screenshots__/verify-fixes.mjs
```

`electron.launch({ executablePath: node_modules/electron/dist/electron,
args: [".","--no-sandbox","--disable-gpu"], env: { IMAGE_VIEWER_FAKE_FS: "1" } })`.
Enter fullscreen from the **main** process
(`BrowserWindow…setFullScreen(true)`) — it fires `enter-full-screen` →
`window:fullScreenChanged` → the renderer's `fullScreen.onChanged`. `app.evaluate`
runs in main, so helpers from the driver script are out of scope; inline them.

`__screenshots__/verify-fixes.mjs` is a reusable driver.

## Showing a human the result

Inline chat screenshots don't reach Kevin in T3 Code, and he can't see the
container FS without Samba — so **hand over a `devshare` link** (browser mode) or,
for a one-off still, host the PNG. See
[`agentic/docs/runbooks/showing-visual-output.md`](../../agentic/docs/runbooks/showing-visual-output.md).
