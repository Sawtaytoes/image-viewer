const assert = require("node:assert/strict")
const fs = require("node:fs")
const { createRequire } = require("node:module")
const path = require("node:path")

// The deletion patch leaves empty vendor directories that shadow parent
// packages during ESM resolution. Remove only those empty directories.
const cleanupPinnedNpmDirectories = (
  projectRoot,
  manifestPath,
) => {
  const modulesRoot = fs.realpathSync(
    path.join(projectRoot, "node_modules"),
  )
  const resolvedManifest = fs.realpathSync(manifestPath)
  const npmRoot = path.dirname(resolvedManifest)
  assert.equal(npmRoot, path.join(modulesRoot, "npm"))
  const manifest = JSON.parse(
    fs.readFileSync(resolvedManifest, "utf8"),
  )
  assert.equal(manifest.name, "npm")
  assert.equal(manifest.version, "11.16.0")
  const vendorRoot = path.join(npmRoot, "node_modules")
  if (!fs.existsSync(vendorRoot)) return 0
  const vendorStat = fs.lstatSync(vendorRoot)
  assert.equal(vendorStat.isSymbolicLink(), false)
  assert.equal(vendorStat.isDirectory(), true)
  let removed = 0
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, {
      withFileTypes: true,
    })) {
      const child = path.join(directory, entry.name)
      const stat = fs.lstatSync(child)
      if (stat.isSymbolicLink() || !stat.isDirectory())
        continue
      visit(child)
      if (fs.readdirSync(child).length > 0) continue
      try {
        fs.rmdirSync(child)
        removed += 1
      } catch (error) {
        if (!["ENOTEMPTY", "EEXIST"].includes(error.code))
          throw error
      }
    }
  }
  visit(vendorRoot)
  return removed
}

if (require.main === module) {
  const fromRelease = createRequire(
    require.resolve("@semantic-release/npm"),
  )
  const removed = cleanupPinnedNpmDirectories(
    path.resolve(__dirname, ".."),
    fromRelease.resolve("npm/package.json"),
  )
  console.info(
    `Removed ${removed} empty npm bundle directories`,
  )
}

module.exports = { cleanupPinnedNpmDirectories }
