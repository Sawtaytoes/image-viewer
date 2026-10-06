import { createPlaywrightConfig } from "@charcuterie/playwright-config"

// The browser smoke: every top-level route in the fleet's four windows
// (`narrow` 384x824, `tall` 1080x1920, `wide` 1920x1080, `ultrawide`
// 3440x1440), one Chromium project each — `createPlaywrightConfig()` builds
// them. See Charcuterie's decision record
// `2026-10-04-every-browser-test-runs-in-four-named-windows`.
//
// The server is browser mode's own Vite dev server (`pnpm dev:browser`, minus
// its fixed port): `index.browser.html` → `src/browserEntry.tsx`, whose
// `window.api` is the in-memory fake filesystem in `src/fakeFileSystem.ts`.
// Every folder and image on screen is generated fixture data — nothing reads a
// disk. `IMAGE_VIEWER_BROWSER_MODE` turns on the SPA fallback that answers a
// route path with the browser entry rather than the Electron `index.html`.
//
// The port is overridable because `pnpm dev:browser`'s 5175 may already be
// somebody's live preview, and a port that answers is not proof it is ours.
const port = Number(
  process.env.IMAGE_VIEWER_E2E_PORT ?? 4175,
)

export default createPlaywrightConfig({
  testDir: "./e2e",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --config vite.renderer.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    env: { IMAGE_VIEWER_BROWSER_MODE: "1" },
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}/index.browser.html`,
  },
})
