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
