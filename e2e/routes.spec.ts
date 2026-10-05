import {
  expectNoHorizontalOverflow,
  expectNoSplitWords,
} from "@charcuterie/playwright-config/responsive.js"
import { expect, type Page, test } from "@playwright/test"

// The browser smoke. Every top-level route, in each of the fleet's four
// windows (one Playwright project per window — see `playwright.config.ts`):
// the page renders its fixture content, throws nothing, nothing overflows the
// window sideways or is clipped out of sight inside an `overflow-x: hidden`
// box, and no heading breaks a word across two lines. A full-page screenshot
// per route and window goes into the HTML report as an ATTACHMENT for a person
// to look at. It is not compared against anything: this repo writes no
// screenshot assertions
// (`docs/decisions/2026-05-10-no-snapshot-or-screenshot-tests.md`), and the
// pixel comparison is the shared `vrt` job's work (`scripts/vrtCapture.mjs`).
//
// The route table (`src/renderer.tsx`) has `/` and a catch-all that redirects
// to it. The folder is a `?filePath=` query on `/`, not a route, but the image
// gallery is the screen the app exists for, so it is covered as its own entry.
// Everything on screen is the generated fake tree from `src/fakeFileSystem.ts`
// (gradient BMPs in Abstract, Cats, Dogs, and Landscapes).

type RouteCase = {
  name: string
  path: string
  // Text that is on screen only once the route has drawn its fixture content.
  readyText: string
  expectedSearch: string
}

const routes: RouteCase[] = [
  {
    expectedSearch: "?filePath=%2F",
    name: "root folder",
    path: "/",
    readyText: "Landscapes",
  },
  {
    expectedSearch: "?filePath=%2FCats",
    name: "image gallery",
    path: "/?filePath=%2FCats",
    readyText: "Cats",
  },
  {
    // The catch-all: an unknown path redirects to `/`, served by the SPA
    // fallback's browser entry rather than the Electron `index.html`.
    expectedSearch: "?filePath=%2F",
    name: "unknown path",
    path: "/no/such/route",
    readyText: "Landscapes",
  },
]

// Every `<img>` decoded, and the count unchanged between two reads: the
// gallery is virtualized and its loader is a queue, so one image arriving is
// not the screen being done.
const waitForImagesToSettle = async (page: Page) => {
  let previousCount = -1

  await expect
    .poll(async () => {
      const { count, isEveryImageDecoded } =
        await page.evaluate(() => ({
          count: document.images.length,
          isEveryImageDecoded: [...document.images].every(
            (image) =>
              image.complete && image.naturalWidth > 0,
          ),
        }))
      const isSettled =
        isEveryImageDecoded &&
        count > 0 &&
        count === previousCount

      previousCount = count

      return isSettled
    })
    .toBe(true)
}

for (const route of routes) {
  test(`${route.name} renders without overflowing the window`, async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = []

    page.on("pageerror", (error) => {
      pageErrors.push(String(error))
    })

    await page.goto(route.path)

    await expect(
      page
        .getByText(route.readyText, { exact: true })
        .first(),
    ).toBeVisible()
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/" &&
        url.search === route.expectedSearch,
    )
    await waitForImagesToSettle(page)

    await expectNoHorizontalOverflow(page)
    await expectNoSplitWords(page)

    await testInfo.attach(
      `${route.name} (${testInfo.project.name})`,
      {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      },
    )

    expect(pageErrors).toEqual([])
  })
}

// The gallery's tiles are cards, so they lay out as a grid that gains columns
// as the window widens — never one card stretched across a wide window. The
// column count comes from the list's own width (`FileBrowser`'s
// `calculateNumberOfColumns`: one column per 300px), so the claim is the same
// in all four windows: each tile is card-sized (at least 300px, under 600px or
// a second one would fit beside it), and the row is as many tiles as fit.
test("image gallery is a grid of card-sized tiles", async ({
  page,
}) => {
  await page.goto("/?filePath=%2FCats")
  await waitForImagesToSettle(page)

  const {
    columnCount,
    containerWidth,
    tileCount,
    tileWidth,
  } = await page.evaluate(() => {
    // `VirtualizedList` positions each tile absolutely with inline
    // `left`/`top`; those wrappers are the grid cells.
    const tiles = [
      ...document.querySelectorAll<HTMLElement>(
        "div.absolute[style]",
      ),
    ].filter(
      (element) =>
        element.style.left !== "" &&
        element.style.top !== "",
    )

    return {
      columnCount: new Set(
        tiles.map((tile) =>
          Math.round(tile.getBoundingClientRect().left),
        ),
      ).size,
      containerWidth:
        tiles[0]?.parentElement?.clientWidth ?? 0,
      tileCount: tiles.length,
      tileWidth:
        tiles[0]?.getBoundingClientRect().width ?? 0,
    }
  })

  expect(tileCount).toBeGreaterThan(0)
  expect(tileWidth).toBeGreaterThanOrEqual(300)
  expect(tileWidth).toBeLessThan(600)
  expect(columnCount).toBe(
    Math.min(
      tileCount,
      Math.round(containerWidth / tileWidth),
    ),
  )
})
