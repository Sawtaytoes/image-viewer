import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "vitest"

import {
  buildAppIcons,
  encodeIcns,
  encodeIco,
} from "./appIcon"

const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

describe(encodeIco.name, () => {
  test("indexes each image and writes 256 as 0", () => {
    const small = Buffer.from("small")
    const large = Buffer.from("large image")
    const ico = encodeIco(
      new Map([
        [16, small],
        [256, large],
      ]),
    )

    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(2)

    const directoryLength = 6 + 16 * 2
    expect(ico.readUInt8(6)).toBe(16)
    expect(ico.readUInt32LE(6 + 8)).toBe(small.length)
    expect(ico.readUInt32LE(6 + 12)).toBe(directoryLength)

    expect(ico.readUInt8(22)).toBe(0)
    expect(ico.readUInt32LE(22 + 8)).toBe(large.length)
    expect(ico.readUInt32LE(22 + 12)).toBe(
      directoryLength + small.length,
    )

    expect(
      ico
        .subarray(directoryLength + small.length)
        .toString(),
    ).toBe("large image")
  })
})

describe(encodeIcns.name, () => {
  test("writes the magic, the total length and each entry", () => {
    const png = Buffer.from("png")
    const icns = encodeIcns([["ic07", png]])

    expect(icns.subarray(0, 4).toString("ascii")).toBe(
      "icns",
    )
    expect(icns.readUInt32BE(4)).toBe(icns.length)
    expect(icns.subarray(8, 12).toString("ascii")).toBe(
      "ic07",
    )
    expect(icns.readUInt32BE(12)).toBe(8 + png.length)
    expect(icns.subarray(16).toString()).toBe("png")
  })
})

describe(buildAppIcons.name, () => {
  test("rasterizes the mark into all three platform files", async () => {
    const outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "image-viewer-icon-"),
    )
    try {
      await buildAppIcons({
        markPath: path.join(
          import.meta.dirname,
          "..",
          "public",
          "favicon.svg",
        ),
        outputDirectory,
      })

      const png = await readFile(
        path.join(outputDirectory, "icon.png"),
      )
      expect(png.subarray(0, 8)).toEqual(pngSignature)
      // A PNG's IHDR width and height follow the 8-byte signature and the
      // chunk's 8-byte length and type.
      expect(png.readUInt32BE(16)).toBe(512)
      expect(png.readUInt32BE(20)).toBe(512)

      const ico = await readFile(
        path.join(outputDirectory, "icon.ico"),
      )
      expect(ico.readUInt16LE(4)).toBe(7)

      const icns = await readFile(
        path.join(outputDirectory, "icon.icns"),
      )
      expect(icns.subarray(0, 4).toString("ascii")).toBe(
        "icns",
      )
      expect(icns.readUInt32BE(4)).toBe(icns.length)
    } finally {
      await rm(outputDirectory, {
        force: true,
        recursive: true,
      })
    }
  })
})
