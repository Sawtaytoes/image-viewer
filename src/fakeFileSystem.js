// In-memory fake filesystem for safe manual verification. Enabled by setting
// the IMAGE_VIEWER_FAKE_FS environment variable (see preload.js); when it's
// unset the app uses the real disk and this module is never constructed.
//
// The whole tree lives in the preload (renderer) process so a virtual delete
// is immediately visible to the next directory listing — no IPC, no disk, no
// `shell.trashItem`. This lets the columns/gallery UI (including the delete
// flow) be exercised end-to-end without any risk of touching real files.
//
// Image bytes are generated on demand as tiny 24-bit BMPs (uncompressed, no
// CRC/deflate needed), which Chromium decodes from a Blob URL like any other
// image. Each folder paints its images in one hue family (Cats=red, Dogs=blue,
// …) so you can tell which folder you're looking at at a glance; within a
// folder the lightness fans across a band so individual images still read as
// distinct shades. The root's loose images are near-gray to mark "you're at
// the top".

import { imageMimeTypesByExtension } from "./imageMimeTypes"

// Same image-extension set the real preload uses, so the fake tree's gallery
// detection matches production.
const imageExtensions = new Set(
  Object.keys(imageMimeTypesByExtension),
)

// Convert HSL (hue in [0,360), saturation & lightness in [0,1]) to 0–255 RGB.
const hslToRgb = (hue, saturation, lightness) => {
  const chroma =
    (1 - Math.abs(2 * lightness - 1)) * saturation
  const huePrime = hue / 60
  const secondary =
    chroma * (1 - Math.abs((huePrime % 2) - 1))
  const match = lightness - chroma / 2

  const [red, green, blue] =
    huePrime < 1
      ? [chroma, secondary, 0]
      : huePrime < 2
        ? [secondary, chroma, 0]
        : huePrime < 3
          ? [0, chroma, secondary]
          : huePrime < 4
            ? [0, secondary, chroma]
            : huePrime < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary]

  return [red, green, blue].map((channel) =>
    Math.round((channel + match) * 255),
  )
}

// Folders use a vivid saturation; the root's loose images stay near-gray.
const folderSaturation = 0.62
const rootSaturation = 0.08

// Spread each folder's images across a lightness band so they're the same hue
// but visibly different shades. `index` is 0-based within the folder.
const shadeLightnessMin = 0.4
const shadeLightnessMax = 0.68

const shadeLightness = (index, count) =>
  count <= 1
    ? (shadeLightnessMin + shadeLightnessMax) / 2
    : shadeLightnessMin +
      ((shadeLightnessMax - shadeLightnessMin) * index) /
        (count - 1)

// A few aspect ratios so the viewer's fit-to-pane math (portrait vs landscape)
// gets exercised. Kept small to keep the generated buffers tiny.
const dimensionPresets = [
  [320, 240],
  [240, 320],
  [300, 300],
  [360, 200],
  [200, 360],
]

// Build a valid 24-bit uncompressed BMP with a gentle vertical gradient so the
// image reads as a real picture rather than a flat block.
const createBmp = (width, height, [red, green, blue]) => {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4d) // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true) // pixel data offset

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive height ⇒ bottom-up rows
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(34, pixelArraySize, true)
  view.setInt32(38, 2835, true) // 72 DPI horizontal
  view.setInt32(42, 2835, true) // 72 DPI vertical

  const padding = rowSize - width * 3

  let offset = 54

  for (let y = 0; y < height; y += 1) {
    const gradient =
      0.6 + (0.4 * y) / Math.max(1, height - 1)

    for (let x = 0; x < width; x += 1) {
      // BMP stores pixels as BGR.
      view.setUint8(offset, Math.round(blue * gradient))
      view.setUint8(
        offset + 1,
        Math.round(green * gradient),
      )
      view.setUint8(offset + 2, Math.round(red * gradient))

      offset += 3
    }

    offset += padding
  }

  return buffer
}

// Two decimal digits so names sort naturally (image-01 … image-12).
const padNumber = (value) => String(value).padStart(2, "0")

const millisecondsPerDay = 24 * 60 * 60 * 1000

// Day-offsets (back from "now") cycled across generated entries so the
// sort-by-date-modified view lands items in every Windows-style bucket — today,
// yesterday, earlier this week, last week, this month, last month, this year,
// and a long time ago — when browsing the fake tree via `yarn start:fake`.
const modifiedDayOffsetPresets = [
  0, 1, 4, 9, 18, 45, 150, 900,
]

// Declarative description of the tree. Each folder lists how many images it
// holds, its `hue` (the color family its images are painted in), and any
// subfolders; the root also carries a few loose images.
const fakeTreeSpec = {
  looseImageCount: 3,
  folders: [
    {
      name: "Cats",
      hue: 0,
      imageCount: 12,
      subfolders: [],
    }, // red
    {
      name: "Dogs",
      hue: 220,
      imageCount: 9,
      subfolders: [],
    }, // blue
    {
      name: "Landscapes",
      hue: 130, // green
      imageCount: 7,
      subfolders: [
        { name: "Mountains", hue: 175, imageCount: 5 },
      ], // teal
    },
    {
      name: "Abstract",
      hue: 285,
      imageCount: 15,
      subfolders: [],
    }, // purple
  ],
}

// Builds the flat path → node map. `path` is node's path module (passed in so
// path semantics exactly match the host OS: `\` on Windows, `/` elsewhere).
const createFakeFileSystem = ({ path }) => {
  const rootPath = path.sep === "\\" ? "C:\\" : "/"

  // path → { name, isDirectory, isFile, children:Set<path>, parent, color, w, h }
  const nodesByPath = new Map()

  // Cycles the aspect-ratio presets across every image so the viewer's
  // fit-to-pane math gets a mix of portrait/landscape regardless of color.
  let dimensionSeed = 0

  // Captured once so every node's mtime is relative to the same "now"; the
  // cycling offsets then fan entries across the date-modified buckets.
  const creationTime = Date.now()

  let modifiedTimeSeed = 0

  const nextModifiedTime = () => {
    const dayOffset =
      modifiedDayOffsetPresets[
        modifiedTimeSeed % modifiedDayOffsetPresets.length
      ]

    modifiedTimeSeed += 1

    return creationTime - dayOffset * millisecondsPerDay
  }

  const addDirectory = (directoryPath, name, parent) => {
    nodesByPath.set(directoryPath, {
      children: new Set(),
      isDirectory: true,
      isFile: false,
      modifiedTime: nextModifiedTime(),
      name,
      parent,
    })

    if (parent) {
      nodesByPath.get(parent).children.add(directoryPath)
    }
  }

  const addImage = (parentPath, fileName, color) => {
    const filePath = path.join(parentPath, fileName)

    const [width, height] =
      dimensionPresets[
        dimensionSeed % dimensionPresets.length
      ]

    nodesByPath.set(filePath, {
      color,
      height,
      isDirectory: false,
      isFile: true,
      modifiedTime: nextModifiedTime(),
      name: fileName,
      parent: parentPath,
      width,
    })

    dimensionSeed += 1

    nodesByPath.get(parentPath).children.add(filePath)
  }

  // `hue`/`saturation` define this folder's color family; each image fans
  // across the shared lightness band so they're distinct shades of it.
  const fillFolder = (
    folderPath,
    spec,
    prefix,
    { hue, saturation },
  ) => {
    for (
      let index = 1;
      index <= spec.imageCount;
      index += 1
    ) {
      addImage(
        folderPath,
        `${prefix}-${padNumber(index)}.bmp`,
        hslToRgb(
          hue,
          saturation,
          shadeLightness(index - 1, spec.imageCount),
        ),
      )
    }

    for (const subfolder of spec.subfolders ?? []) {
      const subfolderPath = path.join(
        folderPath,
        subfolder.name,
      )

      addDirectory(
        subfolderPath,
        subfolder.name,
        folderPath,
      )

      fillFolder(
        subfolderPath,
        subfolder,
        subfolder.name.toLowerCase(),
        { hue: subfolder.hue, saturation },
      )
    }
  }

  addDirectory(rootPath, rootPath, null)

  for (const folder of fakeTreeSpec.folders) {
    const folderPath = path.join(rootPath, folder.name)

    addDirectory(folderPath, folder.name, rootPath)

    fillFolder(
      folderPath,
      folder,
      folder.name.toLowerCase(),
      { hue: folder.hue, saturation: folderSaturation },
    )
  }

  for (
    let index = 1;
    index <= fakeTreeSpec.looseImageCount;
    index += 1
  ) {
    addImage(
      rootPath,
      `sample-${padNumber(index)}.bmp`,
      hslToRgb(
        0,
        rootSaturation,
        shadeLightness(
          index - 1,
          fakeTreeSpec.looseImageCount,
        ),
      ),
    )
  }

  const statPath = (targetPath) => {
    const node = nodesByPath.get(targetPath)

    return node
      ? {
          exists: true,
          isDirectory: node.isDirectory,
          isFile: node.isFile,
        }
      : { exists: false, isDirectory: false, isFile: false }
  }

  const readDirectory = (directoryPath) => {
    const node = nodesByPath.get(directoryPath)

    if (!node?.isDirectory) {
      return Promise.resolve([])
    }

    return Promise.resolve(
      [...node.children].map((childPath) => {
        const child = nodesByPath.get(childPath)

        return {
          fileName: child.name,
          filePath: childPath,
          isDirectory: child.isDirectory,
          isFile: child.isFile,
          modifiedTime: child.modifiedTime,
        }
      }),
    )
  }

  // Mirror of the real preload's `findFirstImage`: breadth-first hunt for the
  // first image anywhere under `folderPath` (null ⇒ not a gallery), walking the
  // in-memory tree instead of disk.
  const findFirstImage = (folderPath) => {
    const queue = [folderPath]

    while (queue.length > 0) {
      const currentPath = queue.shift()
      const node = nodesByPath.get(currentPath)

      if (!node?.isDirectory) {
        continue
      }

      const imageNames = []
      const subdirectories = []

      for (const childPath of node.children) {
        const child = nodesByPath.get(childPath)

        if (
          child.isFile &&
          imageExtensions.has(
            path.extname(child.name).toLowerCase(),
          )
        ) {
          imageNames.push(child.name)
        } else if (child.isDirectory) {
          subdirectories.push(childPath)
        }
      }

      if (imageNames.length > 0) {
        imageNames.sort((left, right) =>
          left.localeCompare(right),
        )

        return Promise.resolve({
          name: imageNames[0],
          path: path.join(currentPath, imageNames[0]),
        })
      }

      queue.push(...subdirectories)
    }

    return Promise.resolve(null)
  }

  // Mirror of the real preload's `countFolderImages`: total images anywhere
  // under `folderPath`, walking the in-memory tree instead of disk.
  const countFolderImages = (folderPath) => {
    const queue = [folderPath]

    let count = 0

    while (queue.length > 0) {
      const currentPath = queue.shift()
      const node = nodesByPath.get(currentPath)

      if (!node?.isDirectory) {
        continue
      }

      for (const childPath of node.children) {
        const child = nodesByPath.get(childPath)

        if (
          child.isFile &&
          imageExtensions.has(
            path.extname(child.name).toLowerCase(),
          )
        ) {
          count += 1
        } else if (child.isDirectory) {
          queue.push(childPath)
        }
      }
    }

    return Promise.resolve(count)
  }

  const readImageData = (filePath) => {
    const node = nodesByPath.get(filePath)

    if (!node?.isFile) {
      return Promise.reject(
        new Error(`Fake file not found: ${filePath}`),
      )
    }

    return Promise.resolve({
      data: createBmp(node.width, node.height, node.color),
      mimeType: "image/bmp",
    })
  }

  // Virtual delete: drop the node and its whole subtree, and unlink it from its
  // parent. Mutates the in-memory map only — never disk.
  const deleteFilePath = ({ filePath }) => {
    const node = nodesByPath.get(filePath)

    if (!node) {
      return Promise.resolve(false)
    }

    const removeSubtree = (targetPath) => {
      const targetNode = nodesByPath.get(targetPath)

      if (targetNode?.isDirectory) {
        for (const childPath of targetNode.children) {
          removeSubtree(childPath)
        }
      }

      nodesByPath.delete(targetPath)
    }

    if (node.parent) {
      nodesByPath
        .get(node.parent)
        ?.children.delete(filePath)
    }

    removeSubtree(filePath)

    return Promise.resolve(true)
  }

  return {
    // Open straight into the fake root so the gallery has content immediately.
    cliFilePath: rootPath,
    countFolderImages,
    deleteFilePath,
    findFirstImage,
    getWindowsDrives: () => [rootPath],
    readDirectory,
    readImageData,
    statPath,
  }
}

export { createBmp, createFakeFileSystem, fakeTreeSpec }

export default createFakeFileSystem
