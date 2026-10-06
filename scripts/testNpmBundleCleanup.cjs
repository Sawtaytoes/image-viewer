const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { test } = require("node:test")
const {
  cleanupPinnedNpmDirectories,
} = require("./cleanupNpmBundleDirs.cjs")

const fixture = (run) => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "npm-bundle-cleanup-"),
  )
  const npmRoot = path.join(root, "node_modules", "npm")
  fs.mkdirSync(npmRoot, { recursive: true })
  const manifest = path.join(npmRoot, "package.json")
  fs.writeFileSync(
    manifest,
    JSON.stringify({ name: "npm", version: "11.16.0" }),
  )
  const vendor = path.join(npmRoot, "node_modules")
  fs.mkdirSync(vendor)
  try {
    run({ root, npmRoot, manifest, vendor })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("removes empty nested directories and preserves package files", () =>
  fixture(({ root, manifest, vendor }) => {
    fs.mkdirSync(
      path.join(vendor, "@scope", "empty", "nested"),
      { recursive: true },
    )
    fs.mkdirSync(path.join(vendor, "active"))
    const license = path.join(vendor, "active", "LICENSE")
    fs.writeFileSync(license, "fixture license")
    assert.equal(
      cleanupPinnedNpmDirectories(root, manifest),
      3,
    )
    assert.equal(
      fs.readFileSync(license, "utf8"),
      "fixture license",
    )
    assert.equal(
      fs.existsSync(path.join(vendor, "@scope")),
      false,
    )
    assert.equal(
      cleanupPinnedNpmDirectories(root, manifest),
      0,
    )
  }))

test("never traverses directory symlinks", () =>
  fixture(({ root, manifest, vendor }) => {
    const outside = path.join(root, "outside")
    fs.mkdirSync(path.join(outside, "empty"), {
      recursive: true,
    })
    const link = path.join(vendor, "linked")
    fs.symlinkSync(outside, link, "junction")
    assert.equal(
      cleanupPinnedNpmDirectories(root, manifest),
      0,
    )
    assert.equal(fs.lstatSync(link).isSymbolicLink(), true)
    assert.equal(
      fs.existsSync(path.join(outside, "empty")),
      true,
    )
  }))

test("rejects a symlink as the vendor root", () =>
  fixture(({ root, manifest, vendor }) => {
    fs.rmdirSync(vendor)
    const outside = path.join(root, "outside")
    fs.mkdirSync(outside)
    fs.symlinkSync(outside, vendor, "junction")
    assert.throws(() =>
      cleanupPinnedNpmDirectories(root, manifest),
    )
    assert.equal(fs.existsSync(outside), true)
  }))

test("rejects a different npm version before mutation", () =>
  fixture(({ root, manifest, vendor }) => {
    fs.writeFileSync(
      manifest,
      JSON.stringify({ name: "npm", version: "11.17.0" }),
    )
    fs.mkdirSync(path.join(vendor, "empty"))
    assert.throws(() =>
      cleanupPinnedNpmDirectories(root, manifest),
    )
    assert.equal(
      fs.existsSync(path.join(vendor, "empty")),
      true,
    )
  }))

test("rejects a package outside the project's npm directory", () =>
  fixture(({ root, manifest }) => {
    const foreign = path.join(root, "foreign")
    fs.mkdirSync(foreign)
    const otherManifest = path.join(foreign, "package.json")
    fs.copyFileSync(manifest, otherManifest)
    assert.throws(() =>
      cleanupPinnedNpmDirectories(root, otherManifest),
    )
  }))
