import fs from "node:fs"
import path from "node:path"

import type {
  DeleteFileSystem,
  DeleteTarget,
} from "./deleteItems"

// The real-disk `DeleteFileSystem`, for the main process only. Every call is a
// promise, so a delete never blocks the main process's event loop.

const isPermissionError = (error: unknown) =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "EPERM" || error.code === "EACCES")

// Windows refuses to unlink a read-only file. Clearing the flag and trying
// once more is what `fs.rm` does internally too.
const removeFile = async (filePath: string) => {
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    if (
      process.platform !== "win32" ||
      !isPermissionError(error)
    ) {
      throw error
    }

    await fs.promises.chmod(filePath, 0o666)
    await fs.promises.unlink(filePath)
  }
}

// A folder should be empty by the time it is removed. Explorer can drop a
// `Thumbs.db` or `desktop.ini` into it mid-delete, and a new file could land
// there too, so a folder that is no longer empty falls back to `fs.rm` for
// whatever appeared after the listing.
const removeDirectory = async (directoryPath: string) => {
  try {
    await fs.promises.rmdir(directoryPath)
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOTEMPTY" ||
        error.code === "EEXIST")
    ) {
      await fs.promises.rm(directoryPath, {
        force: true,
        maxRetries: 3,
        recursive: true,
      })

      return
    }

    throw error
  }
}

export const nodeDeleteFileSystem: DeleteFileSystem = {
  basename: (filePath) => path.basename(filePath),
  // `lstat`, not `stat`: a link reports as a link, so the delete removes the
  // link and never walks into the tree it points at.
  getEntryInfo: async (filePath) => {
    const stats = await fs.promises.lstat(filePath)

    return {
      isDirectory: stats.isDirectory(),
      size: stats.size,
    }
  },
  listDirectory: async (directoryPath) => {
    const entries = await fs.promises.readdir(
      directoryPath,
      { withFileTypes: true },
    )

    return entries.map((entry) => ({
      isDirectory: entry.isDirectory(),
      path: path.join(directoryPath, entry.name),
    }))
  },
  removeDirectory,
  removeFile,
}

// The renderer sends the targets, so main checks them before it acts: each
// must be an absolute path, and never a drive or filesystem root.
export const toSafeDeleteTargets = (
  value: unknown,
): DeleteTarget[] => {
  if (!Array.isArray(value)) {
    throw new Error("Delete targets must be a list.")
  }

  return value.map((candidate: unknown) => {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("filePath" in candidate) ||
      typeof candidate.filePath !== "string" ||
      candidate.filePath.length === 0
    ) {
      throw new Error(
        "Each delete target needs a file path.",
      )
    }

    const filePath = candidate.filePath

    if (!path.isAbsolute(filePath)) {
      throw new Error(
        `Refusing to delete a relative path: ${filePath}`,
      )
    }

    const resolvedPath = path.resolve(filePath)

    if (path.parse(resolvedPath).root === resolvedPath) {
      throw new Error(
        `Refusing to delete a drive or filesystem root: ${filePath}`,
      )
    }

    // The path goes back unchanged, because the renderer matches results to
    // its own targets by this exact string.
    return {
      filePath,
      isDirectory:
        "isDirectory" in candidate &&
        candidate.isDirectory === true,
    }
  })
}
