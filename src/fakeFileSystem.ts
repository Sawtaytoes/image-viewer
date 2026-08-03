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
import type {
  DirectoryEntry,
  FolderMatch,
  ImageBytes,
  ImageFile,
  PathStat,
} from "./types"

// The slice of node's `path` this module needs, declared rather than imported.
//
// It is a parameter for a real reason (see `createFakeFileSystem`): the tree is
// built with the HOST's path semantics, so the caller hands in the module it
// already has. Typing it as `typeof import("node:path")` would work and would
// also say that a caller must produce all forty of its members; three is the
// truth, and a test can satisfy three.
interface PathModule {
  extname: (targetPath: string) => string
  join: (...segments: string[]) => string
  sep: string
}

// A colour as 0–255 red, green, blue. A tuple, not `number[]`, because
// `createBmp` destructures three names out of it and an array of unknown length
// would let a two-element caller through.
type RgbColour = [number, number, number]

// The fake tree's nodes, as a discriminated union on `isDirectory`.
//
// The `.js` version had one shape carrying every field, which is how
// `readImageData` came to read `node.width` off a value that might have been a
// directory. It cannot now: `width` does not exist on the directory arm, so the
// `isFile` guard that was already there is what makes the read legal.
interface FakeDirectoryNode {
  children: Set<string>
  isDirectory: true
  isFile: false
  modifiedTime: number
  name: string
  // Null on the root, and only there.
  parent: string | null
}

interface FakeImageNode {
  color: RgbColour
  height: number
  isDirectory: false
  isFile: true
  modifiedTime: number
  name: string
  parent: string
  width: number
}

type FakeNode = FakeDirectoryNode | FakeImageNode

// One folder in the declarative tree description. `subfolders` is optional and
// recursive; `hue` is the colour family this folder's images are painted in.
interface FakeFolderSpec {
  hue: number
  imageCount: number
  name: string
  subfolders?: FakeFolderSpec[]
}

interface FakeTreeSpec {
  folders: FakeFolderSpec[]
  looseImageCount: number
}

// Same image-extension set the real preload uses, so the fake tree's gallery
// detection matches production.
const imageExtensions = new Set(
  Object.keys(imageMimeTypesByExtension),
)

// Convert HSL (hue in [0,360), saturation & lightness in [0,1]) to 0–255 RGB.
const hslToRgb = (
  hue: number,
  saturation: number,
  lightness: number,
): RgbColour => {
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

  // Spelled out rather than `.map()`: `Array.prototype.map` returns
  // `number[]`, which is not a three-tuple, and the only ways to bridge that
  // are a cast or a destructure-and-rebuild. This is the destructure.
  return [
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ]
}

// Folders use a vivid saturation; the root's loose images stay near-gray.
const folderSaturation = 0.62
const rootSaturation = 0.08

// Spread each folder's images across a lightness band so they're the same hue
// but visibly different shades. `index` is 0-based within the folder.
const shadeLightnessMin = 0.4
const shadeLightnessMax = 0.68

const shadeLightness = (index: number, count: number) =>
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
const createBmp = (
  width: number,
  height: number,
  [red, green, blue]: RgbColour,
) => {
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

  for (let row = 0; row < height; row += 1) {
    const gradient =
      0.6 + (0.4 * row) / Math.max(1, height - 1)

    for (let column = 0; column < width; column += 1) {
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
const padNumber = (value: number) =>
  String(value).padStart(2, "0")

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
const fakeTreeSpec: FakeTreeSpec = {
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
const createFakeFileSystem = ({
  path,
}: {
  path: PathModule
}) => {
  const rootPath = path.sep === "\\" ? "C:\\" : "/"

  // path → { name, isDirectory, isFile, children:Set<path>, parent, color, w, h }
  const nodesByPath = new Map<string, FakeNode>()

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

  // Every read of `.children` goes through here.
  //
  // `nodesByPath.get` is `FakeNode | undefined`, and `children` lives only on
  // the directory arm — so the union plus the map's optionality is exactly the
  // pair of facts the `.js` version dereferenced through, nine times. Naming
  // the lookup once means the walks below read as walks instead of as null
  // checks.
  const getDirectory = (
    targetPath: string,
  ): FakeDirectoryNode | undefined => {
    const node = nodesByPath.get(targetPath)

    return node?.isDirectory ? node : undefined
  }

  const addDirectory = (
    directoryPath: string,
    name: string,
    parent: string | null,
  ) => {
    nodesByPath.set(directoryPath, {
      children: new Set(),
      isDirectory: true,
      isFile: false,
      modifiedTime: nextModifiedTime(),
      name,
      parent,
    })

    if (parent) {
      getDirectory(parent)?.children.add(directoryPath)
    }
  }

  const addImage = (
    parentPath: string,
    fileName: string,
    color: RgbColour,
  ) => {
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

    getDirectory(parentPath)?.children.add(filePath)
  }

  // `hue`/`saturation` define this folder's color family; each image fans
  // across the shared lightness band so they're distinct shades of it.
  const fillFolder = (
    folderPath: string,
    spec: FakeFolderSpec,
    prefix: string,
    {
      hue,
      saturation,
    }: { hue: number; saturation: number },
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

  const statPath = (targetPath: string): PathStat => {
    const node = nodesByPath.get(targetPath)

    return node
      ? {
          exists: true,
          isDirectory: node.isDirectory,
          isFile: node.isFile,
        }
      : { exists: false, isDirectory: false, isFile: false }
  }

  // Mirror of main's session-only "resume where I left off" store, keyed by
  // folder path. A single renderer map is enough here — the fake FS runs one
  // window's worth of in-memory state for manual testing.
  const lastIndexByPath = new Map<string, number>()

  const getFolderLastIndex = (folderPath: string) =>
    Promise.resolve(
      lastIndexByPath.has(folderPath)
        ? lastIndexByPath.get(folderPath)
        : null,
    )

  const setFolderLastIndex = (
    folderPath: string,
    index: number,
  ) => {
    lastIndexByPath.set(folderPath, index)
  }

  const readDirectory = (
    directoryPath: string,
  ): Promise<DirectoryEntry[]> => {
    const node = nodesByPath.get(directoryPath)

    if (!node?.isDirectory) {
      return Promise.resolve([])
    }

    return Promise.resolve(
      [...node.children].flatMap((childPath) => {
        const child = nodesByPath.get(childPath)

        // `flatMap` + `[]` rather than `.map()` + a non-null
        // assertion: a path in a parent's `children` that is not in
        // `nodesByPath` is a torn tree, and listing it as an entry
        // with an undefined name is the worse of the two failures.
        return child
          ? [
              {
                fileName: child.name,
                filePath: childPath,
                isDirectory: child.isDirectory,
                isFile: child.isFile,
                modifiedTime: child.modifiedTime,
              },
            ]
          : []
      }),
    )
  }

  // Mirror of the real preload's `findFirstImage`: breadth-first hunt for the
  // first image anywhere under `folderPath` (null ⇒ not a gallery), walking the
  // in-memory tree instead of disk.
  const findFirstImage = (
    folderPath: string,
  ): Promise<ImageFile | null> => {
    const queue = [folderPath]

    for (
      let currentPath = queue.shift();
      currentPath !== undefined;
      currentPath = queue.shift()
    ) {
      const node = getDirectory(currentPath)

      if (!node) {
        continue
      }

      const imageNames: string[] = []
      const subdirectories: string[] = []

      for (const childPath of node.children) {
        const child = nodesByPath.get(childPath)

        if (
          child?.isFile &&
          imageExtensions.has(
            path.extname(child.name).toLowerCase(),
          )
        ) {
          imageNames.push(child.name)
        } else if (child?.isDirectory) {
          subdirectories.push(childPath)
        }
      }

      imageNames.sort((left, right) =>
        left.localeCompare(right),
      )

      const [firstImageName] = imageNames

      if (firstImageName !== undefined) {
        return Promise.resolve({
          name: firstImageName,
          path: path.join(currentPath, firstImageName),
        })
      }

      queue.push(...subdirectories)
    }

    return Promise.resolve(null)
  }

  // Mirror of the real preload's `countFolderImages`: total images anywhere
  // under `folderPath`, walking the in-memory tree instead of disk.
  const countFolderImages = (
    folderPath: string,
  ): Promise<number> => {
    const queue = [folderPath]

    let count = 0

    for (
      let currentPath = queue.shift();
      currentPath !== undefined;
      currentPath = queue.shift()
    ) {
      const node = getDirectory(currentPath)

      if (!node) {
        continue
      }

      for (const childPath of node.children) {
        const child = nodesByPath.get(childPath)

        if (
          child?.isFile &&
          imageExtensions.has(
            path.extname(child.name).toLowerCase(),
          )
        ) {
          count += 1
        } else if (child?.isDirectory) {
          queue.push(childPath)
        }
      }
    }

    return Promise.resolve(count)
  }

  // Mirror of the real preload's `searchFolders`: recursive, case-insensitive
  // folder-name search under the given root, walking the in-memory tree.
  // Descendants only (never the root itself), nearest-first like the disk
  // version.
  //
  // The parameter is `searchRootPath`, not `rootPath`. It WAS `rootPath`, which
  // shadowed the tree's own `rootPath` twenty lines up — the behaviour was
  // right and utterly dependent on the shadow, so renaming the parameter
  // without repointing the queue would have silently changed "search under what
  // you asked for" into "search the whole drive". Two identical names, one
  // scope apart, is not worth the four characters it saves.
  const searchFolders = (
    searchRootPath: string,
    query: string,
  ): Promise<FolderMatch[]> => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return Promise.resolve([])
    }

    const queue = [searchRootPath]
    const results: FolderMatch[] = []

    for (
      let currentPath = queue.shift();
      currentPath !== undefined;
      currentPath = queue.shift()
    ) {
      const node = getDirectory(currentPath)

      if (!node) {
        continue
      }

      for (const childPath of node.children) {
        const child = nodesByPath.get(childPath)

        if (!child?.isDirectory) {
          continue
        }

        if (child.name.toLowerCase().includes(needle)) {
          results.push({
            name: child.name,
            path: childPath,
          })
        }

        queue.push(childPath)
      }
    }

    return Promise.resolve(results)
  }

  const readImageData = (
    filePath: string,
  ): Promise<ImageBytes> => {
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
  const deleteFilePath = ({
    filePath,
  }: {
    filePath: string
    isDirectory?: boolean
  }): Promise<boolean> => {
    const node = nodesByPath.get(filePath)

    if (!node) {
      return Promise.resolve(false)
    }

    const removeSubtree = (targetPath: string) => {
      const targetNode = nodesByPath.get(targetPath)

      if (targetNode?.isDirectory) {
        for (const childPath of targetNode.children) {
          removeSubtree(childPath)
        }
      }

      nodesByPath.delete(targetPath)
    }

    if (node.parent) {
      getDirectory(node.parent)?.children.delete(filePath)
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
    getFolderLastIndex,
    getWindowsDrives: () => [rootPath],
    readDirectory,
    readImageData,
    searchFolders,
    setFolderLastIndex,
    statPath,
  }
}

export { createBmp, createFakeFileSystem, fakeTreeSpec }

export default createFakeFileSystem
