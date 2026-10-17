import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

// The app icon is `assets/icon.svg`, rasterized at package time — never
// redrawn and never committed as a binary. Every platform's file comes from the
// one SVG, so changing the mark is a one-file change. See
// docs/decisions/2026-10-17-the-app-icon-is-the-red-photo-stack.md.

// Windows reads the sizes it needs out of one `.ico`; 256 is the largest an
// `.ico` directory can name.
const icoSizes = [16, 24, 32, 48, 64, 128, 256]

// Each `.icns` type code names one pixel size. The `ic11`–`ic14` codes are the
// @2x variants, which hold the same pixels as a larger plain code.
const icnsTypes: ReadonlyArray<[string, number]> = [
  ["icp4", 16],
  ["icp5", 32],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
  ["ic11", 32],
  ["ic12", 64],
  ["ic13", 256],
  ["ic14", 512],
]

// The Linux packages and the Linux window take one PNG.
const pngSize = 512

// A Windows `.ico` may hold PNG images directly: a 6-byte header, one 16-byte
// directory entry per image, then the images. A size of 256 is written as 0.
export const encodeIco = (
  pngBySize: ReadonlyMap<number, Buffer>,
) => {
  const sizes = [...pngBySize.keys()]
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)

  const directoryLength = 6 + 16 * sizes.length
  const { entries } = sizes.reduce<{
    entries: Buffer[]
    offset: number
  }>(
    (accumulator, size) => {
      const png = pngBySize.get(size) ?? Buffer.alloc(0)
      const entry = Buffer.alloc(16)
      entry.writeUInt8(size >= 256 ? 0 : size, 0)
      entry.writeUInt8(size >= 256 ? 0 : size, 1)
      entry.writeUInt16LE(1, 4)
      entry.writeUInt16LE(32, 6)
      entry.writeUInt32LE(png.length, 8)
      entry.writeUInt32LE(accumulator.offset, 12)
      return {
        entries: [...accumulator.entries, entry],
        offset: accumulator.offset + png.length,
      }
    },
    { entries: [], offset: directoryLength },
  )

  return Buffer.concat([
    header,
    ...entries,
    ...sizes.map(
      (size) => pngBySize.get(size) ?? Buffer.alloc(0),
    ),
  ])
}

// A macOS `.icns` holds PNG images directly too: the 4-byte `icns` magic and
// the file's length, then per image a 4-byte type code, the entry's length
// (its 8-byte header included), and the PNG. Every length is big-endian.
export const encodeIcns = (
  entries: ReadonlyArray<[string, Buffer]>,
) => {
  const encodedEntries = entries.map(([type, png]) => {
    const entryHeader = Buffer.alloc(8)
    entryHeader.write(type, 0, "ascii")
    entryHeader.writeUInt32BE(8 + png.length, 4)
    return Buffer.concat([entryHeader, png])
  })
  const header = Buffer.alloc(8)
  header.write("icns", 0, "ascii")
  header.writeUInt32BE(
    8 +
      encodedEntries.reduce(
        (total, entry) => total + entry.length,
        0,
      ),
    4,
  )
  return Buffer.concat([header, ...encodedEntries])
}

// Writes `icon.ico`, `icon.icns` and `icon.png` into `outputDirectory`.
// Electron Packager takes `<outputDirectory>/icon` and adds the extension the
// target platform needs.
export const buildAppIcons = async ({
  markPath,
  outputDirectory,
}: {
  markPath: string
  outputDirectory: string
}) => {
  const mark = await readFile(markPath)
  // The mark's viewBox is 24 units, so the density that draws it at `size`
  // pixels is 72 dpi scaled by size / 24. Rendering at that density, rather
  // than resizing one large bitmap, keeps the 16 px strokes sharp.
  const renderMark = (size: number) =>
    sharp(mark, { density: Math.ceil((72 * size) / 24) })
      .resize(size, size)
      .png()
      .toBuffer()

  const sizes = [
    ...new Set([
      ...icoSizes,
      ...icnsTypes.map(([, size]) => size),
      pngSize,
    ]),
  ]
  const pngBySize = new Map(
    await Promise.all(
      sizes.map(
        async (size) =>
          [size, await renderMark(size)] as const,
      ),
    ),
  )
  const pngOf = (size: number) =>
    pngBySize.get(size) ?? Buffer.alloc(0)

  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    writeFile(
      path.join(outputDirectory, "icon.ico"),
      encodeIco(
        new Map(
          icoSizes.map((size) => [size, pngOf(size)]),
        ),
      ),
    ),
    writeFile(
      path.join(outputDirectory, "icon.icns"),
      encodeIcns(
        icnsTypes.map(([type, size]) => [
          type,
          pngOf(size),
        ]),
      ),
    ),
    writeFile(
      path.join(outputDirectory, "icon.png"),
      pngOf(pngSize),
    ),
  ])
}
