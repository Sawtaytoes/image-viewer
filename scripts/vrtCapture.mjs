// Visual-regression capture for the shared `vrt` job
// (`Sawtaytoes/charcuterie/.github/workflows/shared-vrt.yml@workflows-v1`).
//
// This app has no Storybook, so the shots come from the REAL renderer: the
// browser build (`index.browser.html` → `src/browserEntry.tsx`), whose
// `window.api` is the in-memory fake filesystem in `src/fakeFileSystem.ts`.
// Every image on screen is a generated gradient BMP and every name is a
// fixture folder (Abstract, Cats, Dogs, Landscapes) — no photo and no path
// from anybody's disk. Electron (`file://`) is deliberately not shot: the
// renderer is the same bundle, and only the router's history differs.
//
// Steps: build the browser entry with the renderer's own Vite config, serve it
// with an SPA fallback, drive each scene in Chromium, and write
// `<scene>__<width>__<scheme>.png` into `$VRT_ACTUAL_DIR` (default
// `.vrt-actual`). A renamed scene is a deleted shot plus a new one, so keep
// the names stable.
//
// Determinism: the clock is pinned (the fake tree stamps its modified times
// off `Date.now()`, and the date-grouped grid buckets them against "now"),
// the timezone and locale are fixed, motion is frozen, and each scene waits
// until every `<img>` has decoded and the count has stopped changing.
//
// Playwright is NOT a dependency of this repo. In CI it comes from the shared
// workflow's own tools (`$VRT_TOOLS`), with the browser it installed
// (`$VRT_BROWSERS_PATH`). Locally, point `VRT_TOOLS` at
// `<charcuterie>/packages/ci/src/vrt` after `npm ci` there.
import { mkdir, readFile, rm } from "node:fs/promises"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import {
  extname,
  join,
  normalize,
  resolve,
} from "node:path"

import { build } from "vite"

const repoRoot = resolve(import.meta.dirname, "..")
const buildDir = join(repoRoot, ".vrt-build")
const actualDir = resolve(
  repoRoot,
  process.env.VRT_ACTUAL_DIR ?? ".vrt-actual",
)

// 2026-01-15 noon UTC. Any fixed instant works; this one keeps the fake
// tree's day offsets inside one year so every date group is populated the
// same way on every run.
const pinnedTime = new Date("2026-01-15T12:00:00.000Z")

const viewports = {
  narrow: { height: 844, width: 390 },
  wide: { height: 800, width: 1280 },
}

const schemes = ["light", "dark"]

// A copy of Charcuterie's `FREEZE_MOTION_CSS`
// (`packages/ci/src/vrt/freezeMotion.js`): a mid-transition frame or a
// blinking caret must never be the pixel that differs.
const freezeMotionCss = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

const loadChromium = () => {
  if (process.env.VRT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH =
      process.env.VRT_BROWSERS_PATH
  }

  const require = createRequire(
    process.env.VRT_TOOLS
      ? join(process.env.VRT_TOOLS, "package.json")
      : import.meta.url,
  )

  return require("playwright").chromium
}

const buildBrowserEntry = () =>
  build({
    build: {
      emptyOutDir: true,
      outDir: buildDir,
      rollupOptions: {
        input: join(repoRoot, "index.browser.html"),
      },
      sourcemap: false,
    },
    configFile: join(repoRoot, "vite.renderer.config.ts"),
    logLevel: "warn",
    root: repoRoot,
  })

// Static server with the same fallback as `vite.browserModeSpaFallback.ts`: a
// path with no file extension is a route and gets the browser entry.
const serve = () =>
  new Promise((resolveServer) => {
    const server = createServer(
      async (request, response) => {
        const pathname = decodeURIComponent(
          new URL(request.url ?? "/", "http://localhost")
            .pathname,
        )
        const filePath = extname(pathname)
          ? join(buildDir, normalize(pathname))
          : join(buildDir, "index.browser.html")

        try {
          const body = await readFile(filePath)

          response.writeHead(200, {
            "content-type":
              contentTypes[extname(filePath)] ??
              "application/octet-stream",
          })
          response.end(body)
        } catch {
          response.writeHead(404)
          response.end()
        }
      },
    )

    server.listen(0, "127.0.0.1", () => {
      resolveServer(server)
    })
  })

// Every `<img>` decoded, and the count unchanged across two checks: the
// gallery is virtualized and its loader is a queue, so "one image arrived" is
// not "the screen is done".
const waitForImagesToSettle = async (page) => {
  let previousCount = -1

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.waitForFunction(
      () =>
        [...document.images].every(
          (image) =>
            image.complete && image.naturalWidth > 0,
        ),
      undefined,
      { timeout: 15_000 },
    )

    const count = await page.evaluate(
      () => document.images.length,
    )

    if (count === previousCount) {
      return
    }

    previousCount = count
    await page.waitForTimeout(300)
  }

  throw new Error("Images never settled.")
}

const openFolder = async (page, name) => {
  await page
    .getByText(name, { exact: true })
    .first()
    .click()
  await page
    .getByRole("button", { name: "Go up a directory" })
    .waitFor()
}

const chooseSortOrder = async (page, optionName) => {
  await page
    .getByRole("button", { name: "Sort order" })
    .click()
  await page
    .getByRole("option", { name: optionName })
    .click()
}

// Each scene starts on a fresh page at the root folder.
const scenes = {
  "folders-root": async () => {},
  "folders-search": async (page) => {
    await page
      .getByPlaceholder(/Search folders/)
      .fill("Mountains")
  },
  "folders-sort-menu": async (page) => {
    await page
      .getByRole("button", { name: "Sort order" })
      .click()
    await page.getByRole("listbox").waitFor()
  },
  "images-by-date": async (page) => {
    await openFolder(page, "Cats")
    await chooseSortOrder(page, "Newest")
  },
  "images-by-name": async (page) => {
    await openFolder(page, "Cats")
  },
  "viewer-single": async (page) => {
    await openFolder(page, "Cats")
    await waitForImagesToSettle(page)
    await page.locator("img").nth(2).click()
    await page
      .getByRole("button", { name: "Add column" })
      .waitFor()
  },
  "viewer-two-columns": async (page) => {
    await openFolder(page, "Cats")
    await waitForImagesToSettle(page)
    await page.locator("img").nth(2).click()
    await page
      .getByRole("button", { name: "Add column" })
      .click()
  },
}

const captureScene = async ({
  browser,
  origin,
  scene,
  scheme,
  viewportName,
}) => {
  const context = await browser.newContext({
    colorScheme: scheme,
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    timezoneId: "UTC",
    viewport: viewports[viewportName],
  })
  const page = await context.newPage()

  await page.clock.setFixedTime(pinnedTime)
  await page.goto(`${origin}/`, { waitUntil: "load" })
  await page.addStyleTag({ content: freezeMotionCss })
  await page
    .getByText("Cats", { exact: true })
    .first()
    .waitFor()
  await waitForImagesToSettle(page)

  await scenes[scene](page)

  await page.evaluate(() => document.fonts.ready)
  await waitForImagesToSettle(page)
  await page.waitForTimeout(400)
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({
    animations: "disabled",
    path: join(
      actualDir,
      `${scene}__${viewportName}__${scheme}.png`,
    ),
  })

  await context.close()
}

const main = async () => {
  const chromium = loadChromium()

  await buildBrowserEntry()
  await mkdir(actualDir, { recursive: true })

  const server = await serve()
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({
    chromiumSandbox: false,
  })
  const failures = []
  const shots = Object.keys(scenes).flatMap((scene) =>
    Object.keys(viewports).flatMap((viewportName) =>
      schemes.map((scheme) => ({
        scene,
        scheme,
        viewportName,
      })),
    ),
  )

  // Four pages at once. Each shot has its own context, so they share
  // nothing but the browser process, and every wait is on page state rather
  // than on elapsed time alone.
  const worker = async () => {
    for (
      let shot = shots.shift();
      shot != null;
      shot = shots.shift()
    ) {
      const name = `${shot.scene}__${shot.viewportName}__${shot.scheme}`

      try {
        await captureScene({ ...shot, browser, origin })
        console.info(`[vrt] ${name}`)
      } catch (error) {
        failures.push(name)
        console.error(
          `[vrt] FAILED ${name}: ${String(error).split("\n")[0]}`,
        )
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: 4 }, worker))
  } finally {
    await browser.close()
    server.close()
    await rm(buildDir, { force: true, recursive: true })
  }

  if (failures.length > 0) {
    console.error(
      `[vrt] ${failures.length} shot(s) failed.`,
    )
    process.exit(1)
  }
}

await main()
