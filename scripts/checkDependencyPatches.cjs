const assert = require("node:assert/strict")
const { createRequire } = require("node:module")
const { spawnSync } = require("node:child_process")
const path = require("node:path")

// Check the module npm's release tooling actually resolves, including bundles.
const releaseRequire = createRequire(
  require.resolve("@semantic-release/npm"),
)
const npmManifest = releaseRequire.resolve(
  "npm/package.json",
)
const npmRequire = createRequire(npmManifest)
const npmCli = path.join(
  path.dirname(npmManifest),
  "bin/npm-cli.js",
)
const versionResult = spawnSync(
  process.execPath,
  [npmCli, "--version", "--offline"],
  { encoding: "utf8" },
)
assert.equal(versionResult.status, 0, versionResult.stderr)
assert.equal(versionResult.stdout.trim(), "11.16.0")
const configResult = spawnSync(
  process.execPath,
  [npmCli, "config", "get", "cache", "--offline"],
  { encoding: "utf8" },
)
assert.equal(configResult.status, 0, configResult.stderr)
assert.ok(configResult.stdout.trim())
const cachePath = npmRequire.resolve("http-cache-semantics")
const CachePolicy = npmRequire("http-cache-semantics")
assert.equal(
  npmRequire("http-cache-semantics/package.json").version,
  "4.3.0",
)
const request = {
  url: "https://fixture.invalid/image",
  method: "GET",
  headers: { host: "fixture.invalid" },
}
for (const restriction of [
  "no-cache",
  "proxy-revalidate",
  "private",
  "no-store",
  "cookie",
]) {
  const response = {
    status: 200,
    headers: {
      date: new Date().toUTCString(),
      "cache-control":
        "max-age=1, " +
        (restriction === "cookie" ? "" : restriction),
      ...(restriction === "cookie"
        ? { "set-cookie": "fixture=1" }
        : {}),
    },
  }
  const policy = new CachePolicy(request, response)
  policy._responseTime -= 5000
  const result = policy.evaluateRequest({
    ...request,
    headers: {
      ...request.headers,
      "cache-control": "max-stale=999999",
    },
  })
  assert.equal(
    result.response,
    undefined,
    `${restriction} cannot bypass response restrictions`,
  )
}
const parse = require("braces/lib/parse")
assert.throws(
  () =>
    parse(`${"(".repeat(120)}fixture${")".repeat(120)}`),
  /nesting depth/,
)
console.log(
  JSON.stringify({
    npmCliVersion: "11.16.0",
    npmOfflineConfig: true,
    cachePath,
    cacheVersion: "4.3.0",
    restrictedResponses: 5,
    nestingBound: true,
  }),
)
