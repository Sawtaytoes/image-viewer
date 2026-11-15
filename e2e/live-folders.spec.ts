import { expect, test } from "@playwright/test"

// The browser bridge is mutable; Electron's bridge is deliberately frozen.
// Simulate a copy into a network share without a filesystem notification.
test("an open gallery reconciles new images in sorted position with a New marker", async ({
  page,
}, testInfo) => {
  await page.goto("/?filePath=%2FCats")
  await expect(
    page.getByRole("button", {
      name: "cats-01.bmp",
      exact: true,
    }),
  ).toBeVisible()
  await page.screenshot({
    path: `__screenshots__/live-before-${testInfo.project.name}.png`,
  })
  await page.evaluate(async () => {
    const readDirectory = window.api.readDirectory
    const readImageData = window.api.readImageData
    const original = (await readDirectory("/Cats")).find(
      (entry) => entry.isFile,
    )
    if (!original) throw new Error("Missing fixture image")
    const addedPath = "/Cats/00-new.bmp"
    window.api.readDirectory = async (path, options) => {
      const entries = await readDirectory(path, options)
      return path === "/Cats"
        ? [
            ...entries,
            {
              ...original,
              fileName: "00-new.bmp",
              filePath: addedPath,
            },
          ]
        : entries
    }
    window.api.readImageData = (path, ...args) =>
      readImageData(
        path === addedPath ? original.filePath : path,
        ...args,
      )
  })
  const added = page.getByRole("button", {
    name: "00-new.bmp",
    exact: true,
  })
  await expect(added).toBeVisible({ timeout: 10_000 })
  await expect(
    added.getByText("New", { exact: true }),
  ).toBeVisible()
  const labels = await page
    .locator("button[aria-label$='.bmp']")
    .evaluateAll((tiles) =>
      tiles.map((tile) => tile.getAttribute("aria-label")),
    )
  expect(labels[0]).toBe("00-new.bmp")
  await page.screenshot({
    path: `__screenshots__/live-after-${testInfo.project.name}.png`,
  })
  await testInfo.attach("Live additions", {
    body: await page.screenshot(),
    contentType: "image/png",
  })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.screenshot({
    path: `__screenshots__/live-after-dark-${testInfo.project.name}.png`,
  })
})
