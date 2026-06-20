import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  createBmp,
  createFakeFileSystem,
  fakeTreeSpec,
} from "./fakeFileSystem"

// The fake tree is built with the host's path semantics, so derive the root the
// same way the module does.
const rootPath = path.sep === "\\" ? "C:\\" : "/"

describe("createBmp", () => {
  it("produces a valid 24-bit BMP of the requested size", () => {
    const width = 4
    const height = 3
    const buffer = createBmp(width, height, [255, 0, 0])

    const view = new DataView(buffer)

    // 'BM' signature.
    expect(view.getUint8(0)).toBe(0x42)
    expect(view.getUint8(1)).toBe(0x4d)

    // Width/height in the info header.
    expect(view.getInt32(18, true)).toBe(width)
    expect(view.getInt32(22, true)).toBe(height)

    // 54-byte headers + padded rows (4*3 bytes/row, already 4-aligned).
    const rowSize = Math.floor((24 * width + 31) / 32) * 4

    expect(buffer.byteLength).toBe(54 + rowSize * height)
  })
})

describe("createFakeFileSystem", () => {
  const setup = () => createFakeFileSystem({ path })

  it("opens at the fake root and lists it as a single drive", () => {
    const fakeFileSystem = setup()

    expect(fakeFileSystem.cliFilePath).toBe(rootPath)
    expect(fakeFileSystem.getWindowsDrives()).toEqual([
      rootPath,
    ])
    expect(fakeFileSystem.statPath(rootPath)).toMatchObject(
      {
        exists: true,
        isDirectory: true,
      },
    )
  })

  it("reports missing paths as nonexistent", () => {
    const fakeFileSystem = setup()

    expect(
      fakeFileSystem.statPath(
        path.join(rootPath, "does-not-exist"),
      ),
    ).toEqual({
      exists: false,
      isDirectory: false,
      isFile: false,
    })
  })

  it("lists the spec's folders plus loose images at the root", async () => {
    const fakeFileSystem = setup()

    const entries =
      await fakeFileSystem.readDirectory(rootPath)

    const directories = entries.filter(
      (entry) => entry.isDirectory,
    )

    const files = entries.filter((entry) => entry.isFile)

    expect(
      directories.map((entry) => entry.fileName),
    ).toEqual(
      fakeTreeSpec.folders.map((folder) => folder.name),
    )

    expect(files).toHaveLength(fakeTreeSpec.looseImageCount)
  })

  it("lists each folder's generated images", async () => {
    const fakeFileSystem = setup()

    const cats = fakeTreeSpec.folders.find(
      (folder) => folder.name === "Cats",
    )

    const entries = await fakeFileSystem.readDirectory(
      path.join(rootPath, "Cats"),
    )

    expect(entries).toHaveLength(cats.imageCount)
    expect(entries.every((entry) => entry.isFile)).toBe(
      true,
    )
  })

  it("returns decodable BMP bytes for an image", async () => {
    const fakeFileSystem = setup()

    const [firstImage] = await fakeFileSystem.readDirectory(
      path.join(rootPath, "Cats"),
    )

    const { data, mimeType } =
      await fakeFileSystem.readImageData(
        firstImage.filePath,
      )

    const view = new DataView(data)

    expect(mimeType).toBe("image/bmp")
    expect(view.getUint8(0)).toBe(0x42)
    expect(view.getUint8(1)).toBe(0x4d)
  })

  it("finds a folder's first image (name-ascending) for its thumbnail", async () => {
    const fakeFileSystem = setup()

    const image = await fakeFileSystem.findFirstImage(
      path.join(rootPath, "Cats"),
    )

    expect(image).toMatchObject({ name: "cats-01.bmp" })
  })

  it("descends into subfolders when a folder has no direct images", async () => {
    const fakeFileSystem = setup()

    const landscapesPath = path.join(rootPath, "Landscapes")

    // Strip Landscapes' own images, leaving only its Mountains subfolder — a
    // pure container folder still counts as a gallery via its descendants.
    const entries =
      await fakeFileSystem.readDirectory(landscapesPath)

    for (const entry of entries.filter(
      (candidate) => candidate.isFile,
    )) {
      await fakeFileSystem.deleteFilePath({
        filePath: entry.filePath,
      })
    }

    const image =
      await fakeFileSystem.findFirstImage(landscapesPath)

    expect(image).toMatchObject({
      name: "mountains-01.bmp",
    })
  })

  it("returns null for a folder with no images at any depth", async () => {
    const fakeFileSystem = setup()

    const dogsPath = path.join(rootPath, "Dogs")

    // Dogs has no subfolders, so emptying its images leaves no gallery.
    const entries =
      await fakeFileSystem.readDirectory(dogsPath)

    for (const entry of entries) {
      await fakeFileSystem.deleteFilePath({
        filePath: entry.filePath,
      })
    }

    expect(
      await fakeFileSystem.findFirstImage(dogsPath),
    ).toBeNull()
  })

  it("virtually deletes a file so it leaves its folder listing", async () => {
    const fakeFileSystem = setup()

    const catsPath = path.join(rootPath, "Cats")

    const before =
      await fakeFileSystem.readDirectory(catsPath)

    const wasDeleted = await fakeFileSystem.deleteFilePath({
      filePath: before[0].filePath,
    })

    const after =
      await fakeFileSystem.readDirectory(catsPath)

    expect(wasDeleted).toBe(true)
    expect(after).toHaveLength(before.length - 1)
    expect(
      fakeFileSystem.statPath(before[0].filePath).exists,
    ).toBe(false)
  })

  it("virtually deletes a folder along with its whole subtree", async () => {
    const fakeFileSystem = setup()

    const landscapesPath = path.join(rootPath, "Landscapes")

    const mountainsPath = path.join(
      landscapesPath,
      "Mountains",
    )

    expect(
      fakeFileSystem.statPath(mountainsPath).exists,
    ).toBe(true)

    await fakeFileSystem.deleteFilePath({
      filePath: landscapesPath,
    })

    expect(
      fakeFileSystem.statPath(landscapesPath).exists,
    ).toBe(false)

    // The subfolder under it is gone too.
    expect(
      fakeFileSystem.statPath(mountainsPath).exists,
    ).toBe(false)

    const rootEntries =
      await fakeFileSystem.readDirectory(rootPath)

    expect(
      rootEntries.some(
        (entry) => entry.fileName === "Landscapes",
      ),
    ).toBe(false)
  })
})
