// @vitest-environment node
import { readFile } from "node:fs/promises"
import path from "node:path"
import convert from "heic-convert"
import { describe, expect, test } from "vitest"

import decodeHeicToJpeg, {
  heicJpegQuality,
} from "./decodeHeicToJpeg"

// `gradient.test.heic` is a 48x32 gradient this project generated, so it
// carries no outside licence and no personal detail.
const readFixture = () =>
  readFile(path.join(__dirname, "gradient.test.heic"))

describe(decodeHeicToJpeg.name, () => {
  test("returns the same JPEG bytes the main process produced before the worker", async () => {
    const heicBytes = await readFixture()
    const expectedJpeg = await convert({
      buffer: heicBytes,
      format: "JPEG",
      quality: 0.92,
    })

    const jpeg = await decodeHeicToJpeg(heicBytes)

    expect(heicJpegQuality).toBe(0.92)
    expect(
      Buffer.from(jpeg).equals(Buffer.from(expectedJpeg)),
    ).toBe(true)
  })

  test("returns an ArrayBuffer holding only the JPEG", async () => {
    // `convert` returns a Node Buffer, which can sit in a larger shared pool.
    // Sending that pool's whole ArrayBuffer once handed the renderer 64 KiB
    // for a 1 KiB image, which is not a valid JPEG.
    const jpeg = await decodeHeicToJpeg(await readFixture())
    const jpegBytes = new Uint8Array(jpeg)

    expect(jpeg).toBeInstanceOf(ArrayBuffer)
    expect([...jpegBytes.subarray(0, 2)]).toEqual([
      0xff, 0xd8,
    ])
    expect([...jpegBytes.subarray(-2)]).toEqual([
      0xff, 0xd9,
    ])
  })

  test("rejects bytes that are not HEIC", async () => {
    await expect(
      decodeHeicToJpeg(new Uint8Array([1, 2, 3, 4])),
    ).rejects.toThrow()
  })
})
